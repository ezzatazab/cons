frappe.ui.form.on("Sales Invoice", {
    refresh(frm) {
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button("Unlink Clearance", async () => {
                // Find linked Clearance
                const result = await frappe.db.get_list("Clearance", {
                    filters: { sales_invoice: frm.doc.name },
                    fields: ["name"]
                });

                if (result.length === 0) {
                    frappe.msgprint("No linked Clearance found.");
                    return;
                }

                const clearance_name = result[0].name;

                // 1. Unlink clearance from Clearance document
                await frappe.db.set_value("Clearance", clearance_name, "sales_invoice", "");

                // 2. Clear custom_clearance field from Sales Invoice
                await frappe.db.set_value("Sales Invoice", frm.doc.name, "custom_clearance", "");

                frappe.msgprint(`Unlinked Clearance <b>${clearance_name}</b> and cleared reference on this Sales Invoice.`);
                frm.reload_doc();
            });
        }
    }
});
