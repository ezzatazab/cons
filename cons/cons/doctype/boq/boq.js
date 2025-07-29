frappe.ui.form.on("Cost of Raw Materials", {
    valuation: function(frm, cdt, cdn) {
        var d = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, "total_estimated_qty", d.qty);
        frappe.model.set_value(cdt, cdn, "total_valuation", d.qty * d.valuation);
    }
});
frappe.ui.form.on("Cost of Raw Materials", {
    qty: function(frm, cdt, cdn) {
        var d = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, "total_estimated_qty", d.qty);
        frappe.model.set_value(cdt, cdn, "total_valuation", d.qty * d.valuation);
    }
});

frappe.ui.form.on("BOQ", {
validate:function(frm, cdt, cdn){
var dw = locals[cdt][cdn];
var total = 0;


frm.doc.cost_of_raw_materials.forEach(function(dw) { total += dw.total_valuation; });
frm.set_value("total_cost_of_raw_materials", total);
refresh_field("total_cost_of_raw_materials");


}, });

frappe.ui.form.on('Cost of Raw Materials', {
    total_valuation: function(frm, cdt, cdn) {
        let total = 0;
        frm.doc.cost_of_raw_materials.forEach(row => {
            total += row.total_valuation || 0;
        });
        frm.set_value('total_cost_of_raw_materials', total);
    }
});

frappe.ui.form.on('BOQ', {
    start_date: function(frm) {
        calculate_expected_time_period(frm);
    },
    end_date: function(frm) {
        calculate_expected_time_period(frm);
    }
});

function calculate_expected_time_period(frm) {
    if (frm.doc.start_date && frm.doc.end_date) {
        if (frm.doc.end_date < frm.doc.start_date) {
            frappe.throw(__('End Date cannot be earlier than Start Date'));
        }
        const days = frappe.datetime.get_day_diff(frm.doc.end_date, frm.doc.start_date);
        frm.set_value('expected_time_period', days);
    } else {
        frm.set_value('expected_time_period', null);
    }
}

frappe.ui.form.on('BOQ', {
    validate: function(frm) {
        if (frm.doc.start_date && frm.doc.end_date) {
            if (frm.doc.end_date < frm.doc.start_date) {
                frappe.throw(__('End Date cannot be earlier than Start Date'));
            }
        }
    }
});

frappe.ui.form.on("Costs table", {
    valuation: function(frm, cdt, cdn) {
        var d = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, "total_estimated_qty", d.qty);
        frappe.model.set_value(cdt, cdn, "total_valuation", d.qty * d.valuation);
    }
});
frappe.ui.form.on("Costs table", {
    qty: function(frm, cdt, cdn) {
        var d = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, "total_estimated_qty", d.qty);
        frappe.model.set_value(cdt, cdn, "total_valuation", d.qty * d.valuation);
    }
});

////////////////////////////////////////////////////////////////////
frappe.ui.form.on("BOQ", {
validate:function(frm, cdt, cdn){
var dw = locals[cdt][cdn];
var total = 0;

frm.doc.labor_costs.forEach(function(dw) { total += dw.total_valuation; });
frm.set_value("total_labor_costs", total);
refresh_field("total_labor_costs");
}, });



frappe.ui.form.on('Costs table', {
    total_valuation: function(frm, cdt, cdn) {
        let total = 0;
        frm.doc.labor_costs.forEach(row => {
            total += row.total_valuation || 0;
        });
        frm.set_value('total_labor_costs', total);
    }
});
////////////////////////////////////////////////////////////////////////
frappe.ui.form.on("BOQ", {
validate:function(frm, cdt, cdn){
var dw = locals[cdt][cdn];
var total = 0;

frm.doc.sub_contracing_table.forEach(function(dw) { total += dw.total_valuation; });
frm.set_value("total_sub_contracing_value", total);
refresh_field("total_sub_contracing_value");
}, });



frappe.ui.form.on('Costs table', {
    total_valuation: function(frm, cdt, cdn) {
        let total = 0;
        frm.doc.sub_contracing_table.forEach(row => {
            total += row.total_valuation || 0;
        });
        frm.set_value('total_sub_contracing_value', total);
    }
});
///////////////////////////////////////////////////////////////////////

frappe.ui.form.on("BOQ", {
validate:function(frm, cdt, cdn){
var dw = locals[cdt][cdn];
var total = 0;

frm.doc.expenses.forEach(function(dw) { total += dw.total_valuation; });
frm.set_value("total_expenses", total);
refresh_field("total_expenses");
}, });



frappe.ui.form.on('Costs table', {
    total_valuation: function(frm, cdt, cdn) {
        let total = 0;
        frm.doc.expenses.forEach(row => {
            total += row.total_valuation || 0;
        });
        frm.set_value('total_expenses', total);
    }
});

frappe.ui.form.on('BOQ', {
    total_cost_of_raw_materials: function(frm) {
        calculate_total_project_cost(frm);
    },
    total_labor_costs: function(frm) {
        calculate_total_project_cost(frm);
    },
    total_sub_contracing_value: function(frm) {
        calculate_total_project_cost(frm);
    },
    total_expenses: function(frm) {
        calculate_total_project_cost(frm);
    }
});

function calculate_total_project_cost(frm) {
    const raw = frm.doc.total_cost_of_raw_materials || 0;
    const labor = frm.doc.total_labor_costs || 0;
    const subcontract = frm.doc.total_sub_contracing_value || 0;
    const expenses = frm.doc.total_expenses || 0;

    const total = raw + labor + subcontract + expenses;
    frm.set_value('total_value', total);
}

frappe.ui.form.on('BOQ', {
    on_submit: function(frm) {
        const ecv = frm.doc.estimated_cost_voucher;
        const row_id = frm.doc.row_id;
        const new_valuation = frm.doc.total_value;

        if (!ecv || !row_id || !new_valuation) {
            frappe.msgprint("Missing data: Estimated Cost Voucher, Row ID, or Total Value.");
            return;
        }

        // Step 1: Get the Estimated Cost Voucher document
        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Estimated Cost Voucher',
                name: ecv
            },
            callback: function(response) {
                if (!response.message) {
                    frappe.msgprint('Estimated Cost Voucher not found.');
                    return;
                }

                const ecv_doc = response.message;
                let updated = false;

                // Step 2: Update the matching row in the child table
                (ecv_doc.contracting_work_items || []).forEach(row => {
                    if (row.name === row_id) {
                        row.total_valuation = new_valuation;
                        updated = true;
                    }
                });

                if (!updated) {
                    frappe.msgprint('Row ID not found in Contracting Work Items.');
                    return;
                }

                // Step 3: Save the updated ECV document
                frappe.call({
                    method: 'frappe.client.save',
                    args: {
                        doc: ecv_doc
                    },
                    callback: function(save_response) {
                        if (!save_response.exc) {
                            frappe.msgprint(__('Estimated Cost Voucher updated successfully.'));
                        } else {
                            frappe.msgprint(__('Failed to save Estimated Cost Voucher.'));
                        }
                    }
                });
            }
        });
    }
});

