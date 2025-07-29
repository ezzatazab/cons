frappe.ui.form.on('Clearance Table', {
  current_completed_qty(frm, cdt, cdn) {
    update_clearance_row(frm, cdt, cdn);
  },
  current_completation_percentage(frm, cdt, cdn) {
    update_clearance_row(frm, cdt, cdn);
  },
  calculate_on(frm, cdt, cdn) {
    update_clearance_row(frm, cdt, cdn);
  }
});

function update_clearance_row(frm, cdt, cdn) {
  let row = locals[cdt][cdn];

  let total_qty = flt(row.qty);
  let rate = flt(row.rate);
  let total_amount = flt(row.amount);
  let calc_on = row.calculate_on;

  if (total_qty <= 0) {
    frappe.msgprint("يرجى إدخال الكمية الكلية أولاً.");
    return;
  }

  // تحديث current_completed_qty أو percentage بناءً على طريقة الحساب
  if (calc_on === "Percentage") {
    row.current_completed_qty = flt(row.current_completation_percentage / 100) * total_qty;
  } else if (calc_on === "Qty") {
    row.current_completation_percentage = flt(row.current_completed_qty / total_qty) * 100;
  }

  // التحقق من أن النسبة لا تتجاوز 100%
  if (flt(row.current_completation_percentage) > 100) {
    frappe.msgprint("النسبة لا يمكن أن تتجاوز 100%");
    row.current_completation_percentage = 100;
    row.current_completed_qty = total_qty;
  }

  // حساب current_amount
  row.current_amount = flt(row.current_completed_qty * rate);

  // حساب Achieved
  row.achieved_completed_qty = flt(row.previous_completed_qty) + flt(row.current_completed_qty);
  row.achieved_completed_percentage = flt(row.previous_completed_percentage) + flt(row.current_completation_percentage);
  row.achieved_amount = flt(row.previous) + flt(row.current_amount);

  // حساب Outstanding
  row.outstanding_qty = total_qty - row.achieved_completed_qty;
  row.outstanding_percentage = 100 - row.achieved_completed_percentage;
  row.outstanding_amount = total_amount - row.achieved_amount;

  frm.refresh_field("contracting_table");
}


function normalize(text) {
    return (text || "")
        .trim()
        .replace(/\s+/g, " ")
        .normalize("NFKD")
        .replace(/[\u064B-\u065F]/g, "");
}




frappe.ui.form.on("Clearance", {
validate:function(frm, cdt, cdn){
var dw = locals[cdt][cdn];
var total = 0;


frm.doc.discount_table.forEach(function(dw) { total += dw.amount; });
frm.set_value("discount_amount", total);
refresh_field("discount_amount");


}, });





frappe.ui.form.on("Clearance", {
    async validate(frm) {
        console.log("✅ validate event triggered");

        if (!frm.doc.project) {
            console.warn("⚠️ No project selected.");
            return;
        }

        // Step 1: Get the latest previous clearance
        const previous = await frappe.db.get_list("Clearance", {
            filters: {
                project: frm.doc.project,
                docstatus: 1,
                name: ["!=", frm.doc.name]
            },
            fields: ["name", "delivery_date"],
            order_by: "delivery_date desc",
            limit: 1
        });

        if (!previous.length) {
            console.warn("⚠️ No previous clearance found.");
            return;
        }

        const previous_clearance = previous[0].name;
        console.log("📄 Previous clearance:", previous_clearance);

        // Step 2: Fetch full previous clearance document with child table
        const doc = await frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Clearance",
                name: previous_clearance
            }
        });

        const previous_items = doc.message.contracting_table || [];
        console.log("📦 Previous clearance items:", previous_items);

        // Step 3: Match current items and update
        frm.doc.contracting_table.forEach(row => {
            const normalizedItem = normalize(row.item);
            console.log(`🔍 Searching for match for: '${row.item}' → '${normalizedItem}'`);

            let found = false;
            previous_items.forEach(prev => {
                const normalizedPrev = normalize(prev.item);
                console.log(`➡️ Comparing to: '${prev.item}' → '${normalizedPrev}'`);

                if (normalizedItem === normalizedPrev) {
                    row.previous_completed_qty = prev.achieved_completed_qty || 0;
                    row.previous_completed_percentage = prev.achieved_completed_percentage || 0;
                    row.previous = prev.achieved_amount || 0;
                    console.log(`✅ Matched: '${row.item}' with '${prev.item}'`);
                    found = true;
                }
            });

            if (!found) {
                console.warn(`❌ No match found for item: '${row.item}'`);
            }
        });

        frm.refresh_field("contracting_table");
    }
});







frappe.ui.form.on("Clearance", {
    async before_save(frm) {
        console.log("✅ before_save triggered");

        let total_clearance = 0;

        // Step 1: Sum total from child table
        frm.doc.contracting_table.forEach(row => {
            total_clearance += flt(row.current_amount);  // Adjust field if needed
        });

        frm.set_value("total_clearance_amount", total_clearance);

        // Step 2: Always calculate DP and BG discounts (no condition)
        const down_payment_discount_rate = flt(frm.doc.down_payment_discount_rate);
        const business_guarantee_rate = flt(frm.doc.business_guarantee_insurance_discount_rate);

        const down_payment_discount_amount = total_clearance * (down_payment_discount_rate / 100);
        const business_guarantee_discount_amount = total_clearance * (business_guarantee_rate / 100);

        frm.set_value("down_payment_discount_amount", down_payment_discount_amount);
        frm.set_value("business_guarantee_insurance_discount_amount", business_guarantee_discount_amount);

        console.log("📊 Total Clearance:", total_clearance);
        console.log("💸 Down Payment Discount:", down_payment_discount_amount);
        console.log("🛡️ Business Guarantee Discount:", business_guarantee_discount_amount);
    }
});




frappe.ui.form.on('Clearance Table', {
  current_completed_qty(frm, cdt, cdn) {
    update_clearance_row(frm, cdt, cdn);
  },
  current_completation_percentage(frm, cdt, cdn) {
    update_clearance_row(frm, cdt, cdn);
  },
  calculate_on(frm, cdt, cdn) {
    update_clearance_row(frm, cdt, cdn);
  }
});

function update_clearance_row(frm, cdt, cdn) {
  let row = locals[cdt][cdn];

  let total_qty = flt(row.qty);
  let rate = flt(row.rate);
  let total_amount = flt(row.amount);
  let calc_on = row.calculate_on;

  if (total_qty <= 0) {
    frappe.msgprint("يرجى إدخال الكمية الكلية أولاً.");
    return;
  }

  // تحديث current_completed_qty أو percentage بناءً على طريقة الحساب
  if (calc_on === "Percentage") {
    row.current_completed_qty = flt(row.current_completation_percentage / 100) * total_qty;
  } else if (calc_on === "Qty") {
    row.current_completation_percentage = flt(row.current_completed_qty / total_qty) * 100;
  }

  // التحقق من أن النسبة لا تتجاوز 100%
  if (flt(row.current_completation_percentage) > 100) {
    frappe.msgprint("النسبة لا يمكن أن تتجاوز 100%");
    row.current_completation_percentage = 100;
    row.current_completed_qty = total_qty;
  }

  // حساب current_amount
  row.current_amount = flt(row.current_completed_qty * rate);

  // حساب Achieved
  row.achieved_completed_qty = flt(row.previous_completed_qty) + flt(row.current_completed_qty);
  row.achieved_completed_percentage = flt(row.previous_completed_percentage) + flt(row.current_completation_percentage);
  row.achieved_amount = flt(row.previous) + flt(row.current_amount);

  // حساب Outstanding
  row.outstanding_qty = total_qty - row.achieved_completed_qty;
  row.outstanding_percentage = 100 - row.achieved_completed_percentage;
  row.outstanding_amount = total_amount - row.achieved_amount;

  frm.refresh_field("contracting_table");
}


function normalize(text) {
    return (text || "")
        .trim()
        .replace(/\s+/g, " ")
        .normalize("NFKD")
        .replace(/[\u064B-\u065F]/g, "");
}

frappe.ui.form.on("Clearance", {
    async validate(frm) {
        console.log("✅ validate event triggered");
        if (frm.doc.clearance_type=="Outward") {

        if (!frm.doc.project) {
            console.warn("⚠️ No project selected.");
            return;
        }

        // Step 1: Get the latest previous clearance
        const previous = await frappe.db.get_list("Clearance", {
            filters: {
                project: frm.doc.project,
                docstatus: 1,
                name: ["!=", frm.doc.name]
            },
            fields: ["name", "delivery_date"],
            order_by: "delivery_date desc",
            limit: 1
        });

        if (!previous.length) {
            console.warn("⚠️ No previous clearance found.");
            return;
        }

        const previous_clearance = previous[0].name;
        console.log("📄 Previous clearance:", previous_clearance);

        // Step 2: Fetch full previous clearance document with child table
        const doc = await frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Clearance",
                name: previous_clearance
            }
        });

        const previous_items = doc.message.contracting_table || [];
        console.log("📦 Previous clearance items:", previous_items);

        // Step 3: Match current items and update
        frm.doc.contracting_table.forEach(row => {
            const normalizedItem = normalize(row.item);
            console.log(`🔍 Searching for match for: '${row.item}' → '${normalizedItem}'`);

            let found = false;
            previous_items.forEach(prev => {
                const normalizedPrev = normalize(prev.item);
                console.log(`➡️ Comparing to: '${prev.item}' → '${normalizedPrev}'`);

                if (normalizedItem === normalizedPrev) {
                    row.previous_completed_qty = prev.achieved_completed_qty || 0;
                    row.previous_completed_percentage = prev.achieved_completed_percentage || 0;
                    row.previous = prev.achieved_amount || 0;
                    console.log(`✅ Matched: '${row.item}' with '${prev.item}'`);
                    found = true;
                }
            });

            if (!found) {
                console.warn(`❌ No match found for item: '${row.item}'`);
            }
        });

        frm.refresh_field("contracting_table");
    }}
});







frappe.ui.form.on("Clearance", {
    async before_save(frm) {
        console.log("✅ before_save triggered");

        if (frm.doc.clearance_type === "Inward") {
            let total_clearance = 0;

            // Step 1: Sum total from child table
            frm.doc.contracting_table.forEach(row => {
                total_clearance += flt(row.current_amount);
            });

            frm.set_value("total_clearance_amount", total_clearance);

            // Step 2: Always calculate discounts
            const down_payment_discount_rate = flt(frm.doc.down_payment_discount_rate);
            const business_guarantee_rate = flt(frm.doc.business_guarantee_insurance_discount_rate);

            const down_payment_discount_amount = total_clearance * (down_payment_discount_rate / 100);
            const business_guarantee_discount_amount = total_clearance * (business_guarantee_rate / 100);

            frm.set_value("down_payment_discount_amount", down_payment_discount_amount);
            frm.set_value("business_guarantee_insurance_discount_amount", business_guarantee_discount_amount);

            console.log("📊 Total Clearance:", total_clearance);
            console.log("💸 Down Payment Discount:", down_payment_discount_amount);
            console.log("🛡️ Business Guarantee Discount:", business_guarantee_discount_amount);
        }
    }
});



frappe.ui.form.on('Clearance', {
    refresh: function (frm) {
        if (frm.doc.docstatus === 1 && frm.doc.clearance_type === "Outward") {
            frm.add_custom_button(__('Create Sales Invoice'), function () {
                frappe.call({
                    method: "cons.cons.doctype.clearance.clearance.create_sales_invoice",
                    args: {
                        custom_clearance: frm.doc.name
                    },
                    callback: function (r) {
                        if (!r.exc) {
                            frappe.set_route("Form", "Sales Invoice", r.message);
                        }
                    }
                });
            }, __("Create"));
        }
    }
});


frappe.ui.form.on('Clearance', {
    refresh: function (frm) {
        if (frm.doc.docstatus === 1 && frm.doc.clearance_type === "Inward") {
            frm.add_custom_button(__('Create Purchase Invoice'), function () {
                frappe.call({
                    method: "cons.cons.doctype.clearance.clearance.create_purchase_invoice",
                    args: {
                        custom_clearance: frm.doc.name
                    },
                    callback: function (r) {
                        if (!r.exc) {
                            frappe.set_route("Form", "Purchase Invoice", r.message);
                        }
                    }
                });
            }, __("Create"));
        }
    }
});


frappe.ui.form.on("Clearance", {
    async validate(frm) {
        console.log("✅ before_save triggered");

        let total_clearance = 0;

        // 1️⃣ Sum current_amount from contracting_table
        frm.doc.contracting_table.forEach(row => {
            total_clearance += flt(row.current_amount);
        });

        frm.set_value("total_clearance_amount", total_clearance);

        // 2️⃣ Calculate total taxes based on clearance_type
        let total_taxes = 0;

        if (frm.doc.clearance_type === "Outward") {
            (frm.doc.sales_taxes_and_charges || []).forEach(row => {
                total_taxes += flt(row.tax_amount);
            });
        } else if (frm.doc.clearance_type === "Inward") {
            (frm.doc.purchase_taxes_and_charges || []).forEach(row => {
                total_taxes += flt(row.tax_amount);
            });
        }

        frm.set_value("total_taxes", total_taxes);

        // 3️⃣ Calculate total after tax
        const total_after_tax = total_clearance + total_taxes;
        frm.set_value("total_after_tax", total_after_tax);
            }
});


frappe.ui.form.on('Clearance', {
    before_save: function(frm) {
        if(frm.doc.clearance_type=="Outward"){
        const tax_rate = 15;
        const tax_type = 'Actual';
        const account_head = '2300 - Duties and Taxes'; // Adjust as needed

        const clearance_amount = frm.doc.total_clearance_amount || 0;
        const tax_amount = (clearance_amount * tax_rate) / 100;

        // ✅ Remove previous 15% tax rows before adding a new one
        frm.doc.sales_taxes_and_charges = frm.doc.sales_taxes_and_charges.filter(tax => {
            return !(tax.charge_type === tax_type && tax.account_head === account_head && tax.rate === tax_rate);
        });

        // ➕ Add new tax row
        frm.add_child('sales_taxes_and_charges', {
            charge_type: tax_type,
            account_head: account_head,
            rate: tax_rate,
            description: "15%",
            total: clearance_amount + tax_amount,
            tax_amount: tax_amount
        });

        // 🔄 Refresh the tax table
        frm.refresh_field('sales_taxes_and_charges');

        // 📌 Update totals
        frm.set_value('total_taxes', tax_amount);
        frm.set_value('total_after_tax', clearance_amount + tax_amount);
    }}
});


frappe.ui.form.on('Clearance', {
    before_save: function(frm) {
        if(frm.doc.clearance_type=="Inward"){
        const tax_rate = 15;
        const tax_type = 'Actual';
        const account_head = '2300 - Duties and Taxes'; // Adjust as needed

        const clearance_amount = frm.doc.total_clearance_amount || 0;
        const tax_amount = (clearance_amount * tax_rate) / 100;

        // ✅ Remove previous 15% tax rows before adding a new one
        frm.doc.purchase_taxes_and_charges = frm.doc.purchase_taxes_and_charges.filter(tax => {
            return !(tax.charge_type === tax_type && tax.account_head === account_head && tax.rate === tax_rate);
        });

        // ➕ Add new tax row
        frm.add_child('purchase_taxes_and_charges', {
            charge_type: tax_type,
            account_head: account_head,
            rate: tax_rate,
            description: "15%",
            total: clearance_amount + tax_amount,
            tax_amount: tax_amount
        });

        // 🔄 Refresh the tax table
        frm.refresh_field('purchase_taxes_and_charges');

        // 📌 Update totals
        frm.set_value('total_taxes', tax_amount);
        frm.set_value('total_after_tax', clearance_amount + tax_amount);
    }}
});

