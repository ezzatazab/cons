from __future__ import unicode_literals
import frappe
from frappe import _
from cons.cons.doctype.clearance.clearance import update_clearance_bill_status


@frappe.whitelist()
def before_insert(doc, method=None):
    pass
@frappe.whitelist()
def after_insert(doc, method=None):
    pass
@frappe.whitelist()
def onload(doc, method=None):
    pass
@frappe.whitelist()
def before_validate(doc, method=None):
    pass
@frappe.whitelist()
def validate(doc, method=None):
    pass
@frappe.whitelist()
def on_submit(self, method=None):
    for ref in self.references:
        if ref.reference_doctype in ["Sales Invoice", "Purchase Invoice"]:
            update_clearance_bill_status(ref.reference_doctype, ref.reference_name)  

@frappe.whitelist()
def on_cancel(self, method=None):
    for ref in self.references:
        if ref.reference_doctype in ["Sales Invoice", "Purchase Invoice"]:
            update_clearance_bill_status(ref.reference_doctype, ref.reference_name)
@frappe.whitelist()
def on_update_after_submit(doc, method=None):
    pass
@frappe.whitelist()
def before_save(doc, method=None):
    pass
@frappe.whitelist()
def before_cancel(doc, method=None):
    pass
@frappe.whitelist()
def on_update(doc, method=None):
    pass

