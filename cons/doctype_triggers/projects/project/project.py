from __future__ import unicode_literals
import frappe
from frappe import _


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
def before_save(doc, method=None):
    pass
@frappe.whitelist()
def on_update(doc, method=None):
    pass
# your_app/api.py

# @frappe.whitelist()
# def make_estimated_cost_voucher(project_name):
#     """Create an Estimated Cost Voucher from a Project, copying only the
#     custom_contracting_table → contracting_work_items_table rows."""
#     # 1. load the Project
#     proj = frappe.get_doc("Project", name)

#     # 2. build a new voucher
#     voucher = frappe.new_doc("Estimated Cost Voucher")
#     voucher.project = name

#     # 3. copy each row
#     for ct in proj.custom_contracting_table:
#         child = voucher.append("contracting_work_items_table", {})
#         child.main           = ct.main
#         child.idx1           = ct.idx1
#         child.item_category  = ct.item_category
#         child.item           = ct.item
#         child.uom            = ct.uom
#         child.qty            = ct.qty

#     # 4. save & return its name
#     voucher.insert()
#     return voucher.name
