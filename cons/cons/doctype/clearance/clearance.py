import frappe
from frappe.model.document import Document
from frappe.utils import flt, nowdate

class Clearance(Document):
    def on_submit(self):
        settings = frappe.get_single("Clearance Accounts Settings")

        if self.clearance_type == "Outward" and self.status=="Current":
            if not self.customer:
                frappe.throw("Customer must be set for Outward Clearance.")

            total = flt(self.total_clearance_amount)
            total_after_tax=flt(self.total_after_tax)
            tax_amount=flt(self.total_taxes)
            dp_amount = flt(self.down_payment_discount_amount)
            bg_amount = flt(self.business_guarantee_insurance_discount_amount)
            discount_amount = flt(getattr(self, "discount_amount", 0.0))

            receivable_amount = total_after_tax - (dp_amount + bg_amount + discount_amount)

            if not settings.receivable_account:
                frappe.msgprint("Please set the Receivable Account in Clearance Accounts Settings.")
            if not settings.income_account:
                frappe.msgprint("Please set the Income Account in Clearance Accounts Settings.")

            dp_account = settings.down_payment_discount_account_outward
            bg_account = settings.business_guarantee_insurance_account_outward
            tax_account = settings.tax_account
            discount_account = None

            if discount_amount > 0:
                if self.discount_table:
                    discount_account = self.discount_table[0].account
                    if not discount_account:
                        frappe.msgprint("Please set an Account in the Discount Table.")
                else:
                    frappe.msgprint("Discount amount exists, but Discount Table is empty.")

            je = frappe.new_doc("Journal Entry")
            je.voucher_type = "Journal Entry"
            je.posting_date = nowdate()
            je.remark = f"Clearance JE for {self.name}"

            if dp_amount > 0 and dp_account:
                je.append("accounts", {
                    "account": dp_account,
                    "debit_in_account_currency": dp_amount,
                    "party_type": "Customer",
                    "party": self.customer
                })

            if bg_amount > 0 and bg_account:
                je.append("accounts", {
                    "account": bg_account,
                    "debit_in_account_currency": bg_amount,
                    "party_type": "Customer",
                    "party": self.customer
                })

            if discount_amount > 0 and discount_account:
                je.append("accounts", {
                    "account": discount_account,
                    "debit_in_account_currency": discount_amount,
                    "party_type": "Customer",
                    "party": self.customer
                })

            if receivable_amount > 0:
                je.append("accounts", {
                    "account": settings.receivable_account,
                    "debit_in_account_currency": receivable_amount,
                    "party_type": "Customer",
                    "party": self.customer
                })



            if tax_amount > 0:
                je.append("accounts", {
                    "account": settings.tax_account,
                    "credit_in_account_currency": tax_amount
                    
                })



            je.append("accounts", {
                "account": settings.income_account,
                "credit_in_account_currency": total,
                "party_type": "Customer",
                "party": self.customer
            })

            total_debit = sum([flt(a.debit_in_account_currency) for a in je.accounts])
            total_credit = sum([flt(a.credit_in_account_currency) for a in je.accounts])
            diff = round(total_debit - total_credit, 6)

            if abs(diff) > 0.001:
                frappe.throw(f"Journal Entry is not balanced: Debit = {total_debit}, Credit = {total_credit}, Difference = {diff}")

            je.insert(ignore_permissions=True)
            je.submit()
            self.journal_entry = je.name
            frappe.msgprint(f"Outward Journal Entry <b>{je.name}</b> created.")

        if self.clearance_type == "Inward" and self.status=="Current":
            if not self.supplier:
                frappe.throw("Supplier must be set for Inward Clearance.")

            if not settings.expense_account:
                frappe.throw("Please set the Expense Account (Inward) in Clearance Accounts Settings.")
            if not settings.payable_account:
                frappe.throw("Please set the Payable Account (Inward) in Clearance Accounts Settings.")

            total = flt(self.total_clearance_amount)
            total_after_tax=flt(self.total_after_tax)
            tax_amount=flt(self.total_taxes)           
            dp_amount = flt(self.down_payment_discount_amount)
            bg_amount = flt(self.business_guarantee_insurance_discount_amount)
            discount_amount = flt(getattr(self, "discount_amount", 0.0))
            total_clearance_amount = self.total_clearance_amount
            payable_amount = total_after_tax - (dp_amount + bg_amount + discount_amount)

            dp_account = settings.down_payment_discount_account_inward
            bg_account = settings.business_guarantee_insurance_account_inward
            tax_account = settings.tax_account
            discount_account = None

            if discount_amount > 0:
                if self.discount_table:
                    discount_account = self.discount_table[0].account
                    if not discount_account:
                        frappe.throw("Please set an Account in the Discount Table.")
                else:
                    frappe.throw("Discount amount exists, but Discount Table is empty.")

            # --- PRINT ALL VARIABLES ---
            # frappe.throw(f"Total: {total}, DP: {dp_amount}, BG: {bg_amount}, Discount: {discount_amount}, Net Expense: {net_expense}, Payable: {payable_amount}")

            je = frappe.new_doc("Journal Entry")
            je.voucher_type = "Journal Entry"
            je.posting_date = nowdate()
            je.remark = f"Inward Clearance JE for {self.name}"

            # Debit - Expense
            je.append("accounts", {
                "account": settings.expense_account,
                "debit_in_account_currency": total_clearance_amount,
                "party_type": "Supplier",
                "party": self.supplier
            })

            if tax_amount > 0:
                je.append("accounts", {
                    "account": settings.tax_account,
                    "debit_in_account_currency": tax_amount,

                })

            # Credit - Payable (total minus discounts)
            if payable_amount > 0:
                je.append("accounts", {
                    "account": settings.payable_account,
                    "credit_in_account_currency": payable_amount,
                    "party_type": "Supplier",
                    "party": self.supplier
                })

            # Credit - DP
            if dp_amount > 0 and dp_account:
                je.append("accounts", {
                    "account": dp_account,
                    "credit_in_account_currency": dp_amount,
                    "party_type": "Supplier",
                    "party": self.supplier
                })

            # Credit - BG
            if bg_amount > 0 and bg_account:
                je.append("accounts", {
                    "account": bg_account,
                    "credit_in_account_currency": bg_amount,
                    "party_type": "Supplier",
                    "party": self.supplier
                })

            # Credit - Discount
            if discount_amount > 0 and discount_account:
                je.append("accounts", {
                    "account": discount_account,
                    "credit_in_account_currency": discount_amount,
                    "party_type": "Supplier",
                    "party": self.supplier
                })

            # --- PRINT EACH JE LINE ---
            # print("Journal Entry Accounts:")
            # for a in je.accounts:
            #     frappe.throw(f"Account: {a.account}, Debit: {flt(a.debit_in_account_currency)}, Credit: {flt(a.credit_in_account_currency)}")

            total_debit = sum([flt(a.debit_in_account_currency) for a in je.accounts])
            total_credit = sum([flt(a.credit_in_account_currency) for a in je.accounts])
            diff = round(total_debit - total_credit, 6)

            if abs(diff) > 0.001:
                frappe.throw(f"Inward JE is not balanced: Debit = {total_debit}, Credit = {total_credit}, Difference = {diff}")

            je.insert(ignore_permissions=True)
            je.submit()
            self.journal_entry = je.name
            frappe.msgprint(f"Inward Journal Entry <b>{je.name}</b> created.")
       
       
        if self.clearance_type == "Inward" and self.status=="Final":
            if not self.supplier:
                frappe.throw("Supplier must be set for Inward Clearance.")

            if not settings.expense_account:
                frappe.throw("Please set the Expense Account (Inward) in Clearance Accounts Settings.")
            if not settings.payable_account:
                frappe.throw("Please set the Payable Account (Inward) in Clearance Accounts Settings.")

            total = flt(self.total_clearance_amount)
            total_after_tax=flt(self.total_after_tax)
            tax_amount=flt(self.total_taxes)           
            dp_amount = flt(self.down_payment_discount_amount)
            bg_amount = flt(self.business_guarantee_insurance_discount_amount)
            discount_amount = flt(getattr(self, "discount_amount", 0.0))
            total_clearance_amount = self.total_clearance_amount
            payable_amount = total_after_tax - (dp_amount + bg_amount + discount_amount)

            dp_account = settings.down_payment_discount_account_inward
            bg_account = settings.business_guarantee_insurance_account_inward
            tax_account = settings.tax_account
            discount_account = None

            if discount_amount > 0:
                if self.discount_table:
                    discount_account = self.discount_table[0].account
                    if not discount_account:
                        frappe.throw("Please set an Account in the Discount Table.")
                else:
                    frappe.throw("Discount amount exists, but Discount Table is empty.")

            # --- PRINT ALL VARIABLES ---
            # frappe.throw(f"Total: {total}, DP: {dp_amount}, BG: {bg_amount}, Discount: {discount_amount}, Net Expense: {net_expense}, Payable: {payable_amount}")

            je = frappe.new_doc("Journal Entry")
            je.voucher_type = "Journal Entry"
            je.posting_date = nowdate()
            je.remark = f"Inward Clearance JE for {self.name}"

            # Debit - Expense
            je.append("accounts", {
                "account": settings.expense_account,
                "debit_in_account_currency": total_clearance_amount,
                "party_type": "Supplier",
                "party": self.supplier
            })

            if tax_amount > 0:
                je.append("accounts", {
                    "account": settings.tax_account,
                    "debit_in_account_currency": tax_amount,

                })

            # Credit - Payable (total minus discounts)
            if payable_amount > 0:
                je.append("accounts", {
                    "account": settings.payable_account,
                    "credit_in_account_currency": payable_amount,
                    "party_type": "Supplier",
                    "party": self.supplier
                })

            # Credit - DP
            if dp_amount > 0 and dp_account:
                je.append("accounts", {
                    "account": dp_account,
                    "credit_in_account_currency": dp_amount,
                    "party_type": "Supplier",
                    "party": self.supplier
                })

            # Credit - BG
            if bg_amount > 0 and bg_account:
                je.append("accounts", {
                    "account": bg_account,
                    "credit_in_account_currency": bg_amount,
                    "party_type": "Supplier",
                    "party": self.supplier
                })

            # Credit - Discount
            if discount_amount > 0 and discount_account:
                je.append("accounts", {
                    "account": discount_account,
                    "credit_in_account_currency": discount_amount,
                    "party_type": "Supplier",
                    "party": self.supplier
                })

            # --- PRINT EACH JE LINE ---
            # print("Journal Entry Accounts:")
            # for a in je.accounts:
            #     frappe.throw(f"Account: {a.account}, Debit: {flt(a.debit_in_account_currency)}, Credit: {flt(a.credit_in_account_currency)}")

            total_debit = sum([flt(a.debit_in_account_currency) for a in je.accounts])
            total_credit = sum([flt(a.credit_in_account_currency) for a in je.accounts])
            diff = round(total_debit - total_credit, 6)

            if abs(diff) > 0.001:
                frappe.throw(f"Inward JE is not balanced: Debit = {total_debit}, Credit = {total_credit}, Difference = {diff}")

            je.insert(ignore_permissions=True)
            je.submit()
            self.journal_entry = je.name
            frappe.msgprint(f"Inward Journal Entry <b>{je.name}</b> created.")
       



            total_dp_amount = (self.purchase_order_total * self.down_payment_discount_rate) / 100
            total_bg_amount = (self.purchase_order_total * self.business_guarantee_insurance_discount_rate) / 100

            je = frappe.new_doc("Journal Entry")
            je.voucher_type = "Journal Entry"
            je.posting_date = nowdate()
            je.remark = f"Clearance JE for {self.name}"

            if dp_amount > 0 and dp_account:
                je.append("accounts", {
                    "account": dp_account,
                    "debit_in_account_currency": total_dp_amount,
                    "party_type": "Customer",
                    "party": self.customer
                })

            if bg_amount > 0 and bg_account:
                je.append("accounts", {
                    "account": bg_account,
                    "debit_in_account_currency": total_bg_amount,
                    "party_type": "Customer",
                    "party": self.customer
                })

            # This part was incorrectly indented before!
            if (dp_amount > 0 or bg_amount > 0) and self.cash_account:
                je.append("accounts", {
                    "account": self.cash_account,
                    "credit_in_account_currency": total_bg_amount + total_dp_amount,
                })

            # Only submit if accounts were added
            if je.accounts:
                total_debit = sum([flt(a.debit_in_account_currency) for a in je.accounts])
                total_credit = sum([flt(a.credit_in_account_currency) for a in je.accounts])
                diff = round(total_debit - total_credit, 6)

                if abs(diff) > 0.001:
                    frappe.throw(f"Second Journal Entry is not balanced: Debit = {total_debit}, Credit = {total_credit}, Difference = {diff}")

                je.insert(ignore_permissions=True)
                je.submit()
                self.second_journal_entry = je.name
                frappe.msgprint(f"Second Outward Journal Entry <b>{je.name}</b> created.")
       
        if self.clearance_type=="Outward" and self.status =="Final":

            if not self.customer:
                frappe.throw("Customer must be set for Outward Clearance.")

            total = flt(self.total_clearance_amount)
            total_after_tax=flt(self.total_after_tax)
            tax_amount=flt(self.total_taxes)
            dp_amount = flt(self.down_payment_discount_amount)
            bg_amount = flt(self.business_guarantee_insurance_discount_amount)
            discount_amount = flt(getattr(self, "discount_amount", 0.0))

            receivable_amount = total_after_tax - (dp_amount + bg_amount + discount_amount)

            if not settings.receivable_account:
                frappe.msgprint("Please set the Receivable Account in Clearance Accounts Settings.")
            if not settings.income_account:
                frappe.msgprint("Please set the Income Account in Clearance Accounts Settings.")

            dp_account = settings.down_payment_discount_account_outward
            bg_account = settings.business_guarantee_insurance_account_outward
            tax_account = settings.tax_account
            discount_account = None

            if discount_amount > 0:
                if self.discount_table:
                    discount_account = self.discount_table[0].account
                    if not discount_account:
                        frappe.msgprint("Please set an Account in the Discount Table.")
                else:
                    frappe.msgprint("Discount amount exists, but Discount Table is empty.")

            je = frappe.new_doc("Journal Entry")
            je.voucher_type = "Journal Entry"
            je.posting_date = nowdate()
            je.remark = f"Clearance JE for {self.name}"

            if dp_amount > 0 and dp_account:
                je.append("accounts", {
                    "account": dp_account,
                    "debit_in_account_currency": dp_amount,
                    "party_type": "Customer",
                    "party": self.customer
                })

            if bg_amount > 0 and bg_account:
                je.append("accounts", {
                    "account": bg_account,
                    "debit_in_account_currency": bg_amount,
                    "party_type": "Customer",
                    "party": self.customer
                })

            if discount_amount > 0 and discount_account:
                je.append("accounts", {
                    "account": discount_account,
                    "debit_in_account_currency": discount_amount,
                    "party_type": "Customer",
                    "party": self.customer
                })

            if receivable_amount > 0:
                je.append("accounts", {
                    "account": settings.receivable_account,
                    "debit_in_account_currency": receivable_amount,
                    "party_type": "Customer",
                    "party": self.customer
                })



            if tax_amount > 0:
                je.append("accounts", {
                    "account": settings.tax_account,
                    "credit_in_account_currency": tax_amount
                    
                })



            je.append("accounts", {
                "account": settings.income_account,
                "credit_in_account_currency": total,
                "party_type": "Customer",
                "party": self.customer
            })

            total_debit = sum([flt(a.debit_in_account_currency) for a in je.accounts])
            total_credit = sum([flt(a.credit_in_account_currency) for a in je.accounts])
            diff = round(total_debit - total_credit, 6)

            if abs(diff) > 0.001:
                frappe.throw(f"Journal Entry is not balanced: Debit = {total_debit}, Credit = {total_credit}, Difference = {diff}")

            je.insert(ignore_permissions=True)
            je.submit()
            self.journal_entry = je.name
            frappe.msgprint(f"Outward Journal Entry <b>{je.name}</b> created.")



            # Create second Journal Entry (crediting DP and BG accounts, and debiting Cash)
            total_dp_amount = (self.sales_order_total * self.down_payment_discount_rate) / 100
            total_bg_amount = (self.sales_order_total * self.business_guarantee_insurance_discount_rate) / 100

            je = frappe.new_doc("Journal Entry")
            je.voucher_type = "Journal Entry"
            je.posting_date = nowdate()
            je.remark = f"Clearance JE for {self.name}"

            if dp_amount > 0 and dp_account:
                je.append("accounts", {
                    "account": dp_account,
                    "credit_in_account_currency": total_dp_amount,
                    "party_type": "Customer",
                    "party": self.customer
                })

            if bg_amount > 0 and bg_account:
                je.append("accounts", {
                    "account": bg_account,
                    "credit_in_account_currency": total_bg_amount,
                    "party_type": "Customer",
                    "party": self.customer
                })

            # This part was incorrectly indented before!
            if (dp_amount > 0 or bg_amount > 0) and self.cash_account:
                je.append("accounts", {
                    "account": self.cash_account,
                    "debit_in_account_currency": total_bg_amount + total_dp_amount,
                })

            # Only submit if accounts were added
            if je.accounts:
                total_debit = sum([flt(a.debit_in_account_currency) for a in je.accounts])
                total_credit = sum([flt(a.credit_in_account_currency) for a in je.accounts])
                diff = round(total_debit - total_credit, 6)

                if abs(diff) > 0.001:
                    frappe.throw(f"Second Journal Entry is not balanced: Debit = {total_debit}, Credit = {total_credit}, Difference = {diff}")

                je.insert(ignore_permissions=True)
                je.submit()
                self.second_journal_entry = je.name
                frappe.msgprint(f"Second Outward Journal Entry <b>{je.name}</b> created.")


@frappe.whitelist()
def create_sales_invoice(custom_clearance):
        clearance = frappe.get_doc("Clearance", custom_clearance)
    
        if clearance.clearance_type != "Outward":
            frappe.throw("Sales Invoice can only be created for Outward Clearances.")

        if not clearance.customer:
            frappe.throw("Customer must be set on the Clearance.")

        if not clearance.contracting_table:
            frappe.throw("No items in the Clearance.")

        si = frappe.new_doc("Sales Invoice")
        si.customer = clearance.customer
        si.due_date = frappe.utils.nowdate()
        si.custom_clearance = clearance.name  # Optional custom field

        for item in clearance.contracting_table:
            if item.current_completed_qty > 0:
                si.append("items", {
                "item_code": item.item,
                "custom_main": item.main,
                "qty": item.current_completed_qty,
                "rate": item.rate,
                "uom": item.uom,
                "custom_idx1": item.idx1,
                "custom_item_category": item.item_category
        })

        si.insert(ignore_permissions=True)
        clearance.db_set("sales_invoice", si.name)  # make sure the field exists in Clearance Doctype
        return si.name

@frappe.whitelist()
def create_purchase_invoice(custom_clearance):
        clearance = frappe.get_doc("Clearance", custom_clearance)
    
        if clearance.clearance_type != "Inward":
            frappe.throw("Purchase Invoice can only be created for Inward Clearances.")

        if not clearance.supplier:
            frappe.throw("Supplier must be set on the Clearance.")

        if not clearance.contracting_table:
            frappe.throw("No items in the Clearance.")

        pi = frappe.new_doc("Purchase Invoice")
        pi.supplier = clearance.supplier
        pi.due_date = frappe.utils.nowdate()
        pi.custom_clearance = clearance.name  # Optional custom field

        for item in clearance.contracting_table:
            if item.current_completed_qty > 0:
                pi.append("items", {
                "item_code": item.item,
                "custom_main": item.main,
                "qty": item.current_completed_qty,
                "rate": item.rate,
                "uom": item.uom,
                "custom_idx1": item.idx1,
                "custom_item_category": item.item_category
        })

        pi.insert(ignore_permissions=True)
        clearance.db_set("purchase_invoice", pi.name)  # make sure the field exists in Clearance Doctype
        return pi.name

@frappe.whitelist()
def update_clearance_bill_status(doctype, invoice_name):
    if doctype not in ["Sales Invoice", "Purchase Invoice"]:
        frappe.throw("Invalid invoice type")

    invoice = frappe.get_doc(doctype, invoice_name)
    if not invoice.get("custom_clearance"):
        return

    clearance_name = invoice.custom_clearance
    if not frappe.db.exists("Clearance", clearance_name):
        return

    if invoice.docstatus != 1:
        bill_status = "Unpaid"
    elif invoice.outstanding_amount == 0:
        bill_status = "Paid"
    elif invoice.outstanding_amount < invoice.grand_total:
        bill_status = "Partially Paid"
    else:
        bill_status = "Unpaid"

    frappe.db.set_value("Clearance", clearance_name, "bill_status", bill_status)

