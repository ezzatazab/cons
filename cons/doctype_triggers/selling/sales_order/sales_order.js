frappe.ui.form.on('Sales Order', {
  refresh(frm) {
    if (!frm.is_new()) {
      frm.clear_custom_buttons();
      frm.add_custom_button(__('Make Clearance'), () => {

        // 1) Build the Clearance doc in memory
        let clearance = frappe.model.get_new_doc('Clearance');
        clearance.sales_order = frm.doc.name;
        clearance.customer = frm.doc.customer;
        clearance.project = frm.doc.project;
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
          item_category: item.custom_item_category // إذا كان عندك حقل item_category منفصل عدله
        }));

        console.log('🔍 Clearance payload ready:', clearance);

        // 3) Insert the new Clearance via RPC
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
