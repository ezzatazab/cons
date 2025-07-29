["Sales Invoice", "Purchase Invoice"].forEach(doctype => {
    frappe.ui.form.on(doctype, {
        refresh(frm) {
            if (frm.doc.docstatus === 1) {
                frm.add_custom_button("Unlink Clearance", async () => {
                    // Determine the correct field name to filter
                    const clearance_field = doctype === "Sales Invoice" ? "sales_invoice" : "purchase_invoice";

                    // Find linked Clearance
                    const result = await frappe.db.get_list("Clearance", {
                        filters: { [clearance_field]: frm.doc.name },
                        fields: ["name"]
                    });

                    if (result.length === 0) {
                        frappe.msgprint("No linked Clearance found.");
                        return;
                    }

                    const clearance_name = result[0].name;

                    // 1. Unlink clearance from Clearance document
                    await frappe.db.set_value("Clearance", clearance_name, clearance_field, "");

                    // 2. Clear custom_clearance field from Invoice
                    await frappe.db.set_value(doctype, frm.doc.name, "custom_clearance", "");

                    frappe.msgprint(`Unlinked Clearance <b>${clearance_name}</b> and cleared reference on this ${doctype}.`);
                    frm.reload_doc();
                });
            }
        }
    });
});
