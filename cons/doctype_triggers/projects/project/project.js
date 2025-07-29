// Client Script on the child-table doctype
frappe.ui.form.on('Contracting Table', {
  // whenever main is checked/unchecked
  main(frm, cdt, cdn) {
    compute_idx1(frm);
  },
  // whenever a new row is added
  custom_contracting_table_add(frm, cdt, cdn) {
    compute_idx1(frm);
  },
  // whenever a row is removed
  custom_contracting_table_remove(frm, cdt, cdn) {
    compute_idx1(frm);
  }
});

// Also recalc on save, to catch any edge-cases
frappe.ui.form.on('Project', {
  validate(frm) {
    compute_idx1(frm);
  }
});

// --- Helper function ---
function compute_idx1(frm) {
  let groupCount = 0;
  let subCount = 0;

  (frm.doc.custom_contracting_table || []).forEach(row => {
    if (row.main) {
      // start new group
      groupCount += 1;
      subCount = 0;
      frappe.model.set_value(row.doctype, row.name, 'idx1', groupCount.toString());
    } else {
      // same group, increment sub-count
      subCount += 1;
      frappe.model.set_value(
        row.doctype,
        row.name,
        'idx1',
        `${groupCount}-${subCount}`
      );
    }
  });
}






frappe.ui.form.on('Project', {
  setup: function(frm) {
    cur_frm.fields_dict['custom_contracting_table'].grid.get_field("item").get_query = function(doc, cdt, cdn) {
      let row = locals[cdt][cdn];

      let filters = [];

      if (row.item_category) {
        filters.push(['Item', 'custom_item_category', '=', row.item_category]);
      }

      if (row.main === 1) {
        filters.push(['Item', 'custom_main_item', '=', 1]);
      } else {
        filters.push(['Item', 'custom_main_item', '=', 0]);
      }

      if (!row.item_category) {
        frappe.msgprint(__('Please select an Item Category first.'));
        filters.push(['Item', 'name', '=', '__invalid__']); // prevent showing all items
      }

      return {
        filters: filters
      };
    };
  }
});


frappe.ui.form.on('Project', {
  refresh(frm) {
    // only show button on saved documents
    if (!frm.is_new()) {
      frm.add_custom_button(__('Make Estimated Cost Voucher'), () => {
        // open a new Estimated Cost Voucher
        frappe.new_doc('Estimated Cost Voucher', {
          project: frm.doc.name
        });
      }, __('Create'));
    }
  }
});


frappe.ui.form.on('Project', {
  refresh(frm) {
    if (!frm.is_new()) {
      frm.clear_custom_buttons();
      frm.add_custom_button(__('Make Estimated Cost Voucher'), () => {

        // 1) Build the voucher object in memory
        let voucher = frappe.model.get_new_doc('Estimated Cost Voucher');
        voucher.project = frm.doc.name;

        // 2) Construct the array of child rows
        voucher.contracting_work_items = (frm.doc.custom_contracting_table || [])
   
          .map(ct => ({
            main:          ct.main,
            idx1:          ct.idx1,
            item_category: ct.item_category,
            item:          ct.item,
            uom:           ct.uom,
            qty:           ct.qty
          }));

        console.log('🔍 payload ready:', voucher);

        // 3) Insert via RPC
        frappe.call({
          method: 'frappe.client.insert',
          args: { doc: voucher },
          callback: r => {
            if (r.message && r.message.name) {
              frappe.set_route('Form', 'Estimated Cost Voucher', r.message.name);
            } else {
              frappe.msgprint(__('Failed to create voucher. See console.'));
            }
          }
        });
      }, __('Create'));
    }
  }
});

frappe.ui.form.on('Project', {
  validate(frm) {
    // 1. Clear existing summary rows
    frm.clear_table('custom_items_summary');

    // 2. Create a map to store total amount per item_category
    let category_map = {};

    // 3. Loop through contracting table rows where main == 0
    (frm.doc.custom_contracting_table || [])
      .filter(ct => !ct.main) // only rows with main = 0
      .forEach(ct => {
        if (!category_map[ct.item_category]) {
          category_map[ct.item_category] = 0;
        }
        category_map[ct.item_category] += ct.amount || 0;
      });

    // 4. Add rows to summary table with total per item_category
    for (let category in category_map) {
      let summary_row = frm.add_child('custom_items_summary');
      summary_row.item_category = category;
      summary_row.total = category_map[category];  // field to store the sum
    }

    // 5. Refresh the summary table
    frm.refresh_field('custom_items_summary');
  }
});


frappe.ui.form.on('Project', {
    refresh(frm) {
        frm.add_custom_button(__('Create Quotation'), function () {
            if (!frm.doc.customer) {
                frappe.msgprint(__('Please select a customer before creating a quotation.'));
                return;
            }

            const items = [];

            (frm.doc.custom_contracting_table || []).forEach(row => {
                
                    items.push({
                        item_code: row.item,
                        custom_main: row.main,
                        custom_idx1: row.idx1,
                       
                        custom_item_category: row.item_category || '',
                        qty: row.qty || 1,
                        rate: row.rate || 0,
                        amount: row.amount || 0
                    });
                
            });

            if (items.length === 0) {
                frappe.msgprint(__('No items to copy. Make sure there are rows with "main" unchecked.'));
                return;
            }

            frappe.call({
                method: "frappe.client.insert",
                args: {
                    doc: {
                        doctype: "Quotation",
                        quotation_to: "Customer",
                        party_name: frm.doc.customer,
                        project: frm.doc.name,
                        items: items
                    }
                },
                callback: function (r) {
                    if (!r.exc) {
                        frappe.msgprint(__('Quotation created successfully.'));
                        frappe.set_route("Form", "Quotation", r.message.name);
                    }
                }
            });
        });
    }
});

frappe.ui.form.on('Project', {
    refresh(frm) {
        frm.add_custom_button(__('Create Purchase Order'), function () {
            if (!frm.doc.custom_supplier) {
                frappe.msgprint(__('Please select a supplier before creating a Purchase Order.'));
                return;
            }

            const items = [];

            (frm.doc.custom_contracting_table || []).forEach(row => {
                items.push({
                    item_code: row.item,
                    custom_main: row.main,
                    custom_idx1: row.idx1,
                    custom_item_category: row.item_category || '',
                    qty: row.qty || 1,
                    rate: row.rate || 0,
                    amount: row.amount || 0
                });
            });

            if (items.length === 0) {
                frappe.msgprint(__('No items to copy.'));
                return;
            }

            frappe.call({
                method: "frappe.client.insert",
                args: {
                    doc: {
                        doctype: "Purchase Order",
                        supplier: frm.doc.custom_supplier,
                        project: frm.doc.name,
                        schedule_date: frappe.datetime.now_date(),  // Required field
                        items: items
                    }
                },
                callback: function (r) {
                    if (!r.exc) {
                        frappe.msgprint(__('Purchase Order created successfully.'));
                        frappe.set_route("Form", "Purchase Order", r.message.name);
                    }
                }
            });
        });
    }
});
