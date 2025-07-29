frappe.ui.form.on('Purchase Order', {
  refresh(frm) {
    if (!frm.is_new()) {
      frm.clear_custom_buttons();
      frm.add_custom_button(__('Make Clearance'), () => {

        // 1) Create the Clearance doc in memory
        let clearance = frappe.model.get_new_doc('Clearance');
        clearance.purchase_order = frm.doc.name;
        clearance.supplier = frm.doc.supplier;
        clearance.project = frm.doc.project;
        clearance.clearance_type = 'Inward';
        clearance.posting_date = frappe.datetime.get_today();

        // 2) Transfer items to contracting_table
        clearance.contracting_table = (frm.doc.items || []).map(item => ({
          item: item.item_code,
          item_name: item.item_name,
          description: item.description,
          uom: item.uom,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          idx1: item.custom_idx1,
          main: item.custom_main,
          item_category: item.custom_item_category
        }));

        console.log('📦 Clearance payload from PO:', clearance);

        // 3) Insert the Clearance
        frappe.call({
          method: 'frappe.client.insert',
          args: { doc: clearance },
          callback: r => {
            if (r.message && r.message.name) {
              frappe.set_route('Form', 'Clearance', r.message.name);
            } else {
              frappe.msgprint(__('Failed to create Clearance. See console.'));
            }
          }
        });

      }, __('Create'));
    }
  }
});
