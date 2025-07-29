frappe.ui.form.on('Contracting work items', {
  boq: function(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    // Create a new BOQ document
    frappe.new_doc('BOQ', {
      item_category: row.item_category,
      item: row.item,
      uom: row.uom,
      project_qty: row.qty,
      owner1:frm.doc.customer,
      project:frm.doc.project,
      estimated_cost_voucher:frm.doc.name,
      row_id:row.name
      // You can add more fields as required
    });
  }
});


frappe.ui.form.on('Contracting work items', {
    total_valuation: calculate_totals,
    selling_price: calculate_totals,
    margin: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (row.total_valuation && row.margin >= 0) {
            row.selling_price = Math.round((row.total_valuation * (1 + row.margin / 100)) * 100) / 100;
            frm.refresh_field("cost_of_raw_materials");
            calculate_totals(frm);  // also update totals when margin changes
        }
    }
});

function calculate_totals(frm) {
    let totalValuation = 0;
    let totalSelling = 0;

    (frm.doc.contracting_work_items || []).forEach(row => {
        totalValuation += row.total_valuation || 0;
        totalSelling += row.selling_price || 0;
    });

    frm.set_value("total_valuation", totalValuation);
    frm.set_value("total_estimated_selling_price", totalSelling);
    frm.set_value("total_profit", totalSelling - totalValuation);
}

frappe.ui.form.on('Contracting work items', {
    margin: function(frm) {
        let total_margin = 0;
        let count = 0;

        (frm.doc.contracting_work_items || []).forEach(row => {
            if (row.margin) {
                total_margin += row.margin;
                count++;
            }
        });

        const avg_margin = count > 0 ? total_margin / count : 0;
        frm.set_value("profit_margin", Math.round(avg_margin * 100) / 100);
    }
});



frappe.ui.form.on('Estimated Cost Voucher', {
  validate(frm) {
    // 1. Clear existing summary rows
    frm.clear_table('summary_items_cost');

    // 2. Loop through Contracting Work Items where main is checked
    (frm.doc.contracting_work_items || [])
      .filter(row => row.main)
      .forEach(row => {
        let summary_row = frm.add_child('summary_items_cost');
        summary_row.item_category = row.item_category;
      });

    // 3. Refresh the summary table
    frm.refresh_field('summary_items_cost');
  }
});

frappe.ui.form.on('Estimated Cost Voucher', {
  validate(frm) {
    // Clear summary table first
    frm.clear_table('summary_items_cost');

    let summary_map = {};

    // Group by item_category
    (frm.doc.contracting_work_items || []).forEach(row => {
      if (!row.item_category) return;

      if (!summary_map[row.item_category]) {
        summary_map[row.item_category] = {
          item_category: row.item_category,
          total_valuation: 0,
          total_selling_price: 0
        };
      }

      summary_map[row.item_category].total_valuation += row.total_valuation || 0;
      summary_map[row.item_category].total_selling_price += row.selling_price || 0;
    });

    // Push grouped results to summary table
    for (let key in summary_map) {
      let data = summary_map[key];
      let child = frm.add_child('summary_items_cost');
      child.item_category = data.item_category;
      child.total_valuation = data.total_valuation;
      child.total_selling_price = data.total_selling_price;

      // Calculate net profit
      child.total_profit = data.total_selling_price - data.total_valuation;

      // Calculate margin %
      child.total_margin = data.total_valuation > 0
        ? ((child.total_profit / data.total_valuation) * 100).toFixed(2)
        : 0;
    }

    frm.refresh_field('summary_items_cost');
  }
});


frappe.ui.form.on('Estimated Cost Voucher', {
  on_submit(frm) {
    if (!frm.doc.project) return;

    frappe.call({
      method: 'frappe.client.get',
      args: {
        doctype: 'Project',
        name: frm.doc.project
      },
      callback: function (res) {
        if (!res.message) return;
        let project_doc = res.message;
        let updated = false;

        // Loop through Estimated Cost Voucher rows
        (frm.doc.contracting_work_items || []).forEach(ec_row => {
          if (!ec_row.item || !ec_row.item_category) return;

          // Find matching row in Project Contracting Table where main = 0
          (project_doc.custom_contracting_table || []).forEach(pj_row => {
            if (
              pj_row.item === ec_row.item &&
              pj_row.item_category === ec_row.item_category &&
              !pj_row.main
            ) {
              pj_row.amount = ec_row.selling_price || 0;
              pj_row.rate = (pj_row.qty && pj_row.qty > 0)
                ? (pj_row.amount / pj_row.qty)
                : 0;
              updated = true;
            }
          });
        });

        if (updated) {
          // Save the Project doc
          frappe.call({
            method: 'frappe.client.save',
            args: {
              doc: project_doc
            },
            callback: function (r) {
              if (!r.exc) {
                frappe.msgprint(__('Project Contracting Table updated successfully.'));
              }
            }
          });
        }
      }
    });
  }
});

