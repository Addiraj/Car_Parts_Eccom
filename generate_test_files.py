import json, sys, os, re

with open('extracted_test_cases.json', encoding='utf-8') as f:
    rows = json.load(f)

test_files = {}
for r in rows[1:]:
    if len(r) > 2 and r[2].endswith('.test.ts'):
        tf = r[2]
        test_files.setdefault(tf, []).append(r)

missing_files = [
    'tests/unit/admin/catalog.test.ts',
    'tests/unit/admin/cms.test.ts',
    'tests/unit/admin/inventory.test.ts',
    'tests/unit/admin/report-ledger.test.ts',
    'tests/unit/admin/reports.test.ts',
    'tests/unit/admin/salesmen.test.ts'
]

import_map = {
    'tests/unit/admin/catalog.test.ts': '@/lib/admin.catalog.functions',
    'tests/unit/admin/cms.test.ts': '@/lib/admin.cms.functions',
    'tests/unit/admin/inventory.test.ts': '@/lib/admin.inventory.functions',
    'tests/unit/admin/report-ledger.test.ts': '@/lib/admin.report-ledger.functions',
    'tests/unit/admin/reports.test.ts': '@/lib/admin.reports.functions',
    'tests/unit/admin/salesmen.test.ts': '@/lib/admin.salesmen.functions',
}

for mf in missing_files:
    cases = test_files.get(mf, [])
    src_mod = import_map[mf]

    # Collect exported function names
    fns_in_cases = set()
    suites_dict = {}
    
    for c in cases:
        suite_name = c[3]
        raw_fn = c[4].replace('POST /_serverFn/', '').replace('GET /_serverFn/', '').strip()
        if raw_fn and not raw_fn.startswith('('):
            m = re.findall(r'^[a-zA-Z0-9_]+$', raw_fn)
            if m:
                fns_in_cases.add(m[0])
        suites_dict.setdefault(suite_name, []).append(c)

    lines = []
    lines.append('import { describe, it, expect, beforeEach } from "vitest";')
    lines.append(f'import {{\n  {",\n  ".join(sorted(fns_in_cases))}\n}} from "{src_mod}";')
    lines.append('import { getSupabase } from "../../setup";')
    lines.append('import { setTestContext } from "../../helpers/serverfn-mock";')
    lines.append('import { invoke } from "../../helpers/invoke";')
    lines.append('')
    lines.append('const ID = "11111111-1111-1111-1111-111155555555";')
    lines.append('const tiny = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";')
    lines.append('const big = "data:image/png;base64," + "A".repeat(7 * 1024 * 1024);')
    lines.append('const BRAND_ID = "11111111-1111-1111-1111-111155555555";')
    lines.append('const PART_ID = "11111111-1111-1111-1111-111155555555";')
    lines.append('const PART_ID_2 = "22222222-2222-2222-2222-222255555555";')
    lines.append('const WH_ID = "22222222-2222-2222-2222-222255555555";')
    lines.append('const WH_ID_2 = "33333333-3333-3333-3333-333355555555";')
    lines.append('const SM_ID = "55555555-5555-5555-5555-555555555555";')
    lines.append('const CUST_ID = "33333333-3333-3333-3333-333355555555";')
    lines.append('const NOTIF_ID = "44444444-4444-4444-4444-444455555555";')
    lines.append('const oldDate = new Date(Date.now() - 30 * 86400000).toISOString();')
    lines.append('const range = { from: "2020-01-01", to: "2030-12-31" };')
    lines.append('const baseData = { part_id: PART_ID, warehouse_id: WH_ID, movement_type: "IN", quantity: 10 };')
    lines.append('')
    lines.append('beforeEach(() => {')
    lines.append('  setTestContext({ isAdmin: true, userId: "admin-1" });')
    lines.append('});')
    lines.append('')

    for suite, suite_cases in suites_dict.items():
        lines.append(f'describe("{suite}", () => {{')
        for c in suite_cases:
            case_title = c[7]
            precond = c[8] if len(c) > 8 else ''
            payload = c[9] if len(c) > 9 else '(no arguments)'
            expected = c[10] if len(c) > 10 else ''
            
            raw_fn = c[4].replace('POST /_serverFn/', '').replace('GET /_serverFn/', '').strip()
            fn_name = raw_fn if re.match(r'^[a-zA-Z0-9_]+$', raw_fn) else ''

            lines.append(f'  it("{case_title}", async () => {{')
            lines.append('    const sup = getSupabase();')
            
            # Setup precond / mocks if reject or return expected
            m_err = re.search(r'/([^/]+)/', expected)
            err_msg = m_err.group(1) if m_err else "error"
            if '"' in err_msg or "'" in err_msg or "\\" in err_msg:
                err_msg = "error"

            if precond:
                precond_lines = [pl.strip() for pl in precond.replace('\r\n', '\n').split('\n') if pl.strip()]
                for pl in precond_lines:
                    if '→' in pl or '->' in pl or '=' in pl:
                        delim = '→' if '→' in pl else ('->' if '->' in pl else '=')
                        parts_p = pl.split(delim, 1)
                        pkey = parts_p[0].strip().replace('(suite) ', '')
                        pval = parts_p[1].strip()
                        if '...' not in pval and '…' not in pval and not pval.endswith(':'):
                            lines.append(f'    sup.setResponse("{pkey}", {pval});')

            if "rejects non-admin" in case_title.lower() or "forbidden" in case_title.lower():
                lines.append('    setTestContext({ isAdmin: false });')
                lines.append('    sup.setResponse("rpc:has_role", { data: false, error: null });')
            elif ("throws" in case_title.lower() or "error" in case_title.lower() or "fails" in case_title.lower() or "missing" in case_title.lower() or "invalid" in case_title.lower()) and "rolls back" not in case_title.lower():
                lines.append(f'    sup.setResponse("delete:parts", {{ error: "{err_msg}" }});')
                lines.append(f'    sup.setResponse("delete:brands", {{ error: "{err_msg}" }});')
                lines.append(f'    sup.setResponse("delete:warehouses", {{ error: "{err_msg}" }});')
                lines.append(f'    sup.setResponse("select:parts", {{ error: "{err_msg}" }});')
                lines.append(f'    sup.setResponse("select:orders", {{ error: "{err_msg}" }});')
                lines.append(f'    sup.setResponse("upload:avatars", {{ error: "{err_msg}" }});')
                lines.append(f'    sup.setResponse("auth:create", {{ error: "{err_msg}" }});')
                lines.append(f'    sup.setResponse("auth:update", {{ error: "{err_msg}" }});')
                lines.append(f'    sup.setResponse("insert:salesmen", {{ error: "{err_msg}" }});')
                lines.append(f'    sup.setResponse("update:salesmen", {{ error: "{err_msg}" }});')
            elif "rolls back" in case_title.lower():
                lines.append(f'    sup.setResponse("insert:salesmen", {{ error: "{err_msg}" }});')

            # Parse input payload
            if fn_name == 'adminUpsertPartFull':
                call_str = f'invoke({fn_name}, {{ data: {{ part_number: "PN-100", name: "Test Part", price: 100, stock: 10, brand_id: PART_ID, category_id: PART_ID }} }})'
            elif payload == '(no arguments)' or payload == '{ data: {} }':
                call_str = f'invoke({fn_name}, {{ data: {{}} }})' if fn_name else 'Promise.resolve()'
            else:
                call_str = f'invoke({fn_name}, {payload})' if fn_name else 'Promise.resolve()'

            # Render assertions
            expected_clean = expected.replace(" | ", "; ")
            if ".rejects." in expected_clean:
                parts_exp = [p.strip() for p in expected_clean.split(";") if p.strip()]
                for pe in parts_exp:
                    if "expect(" in pe:
                        exp_str = pe if pe.startswith("await ") else f'await {pe}'
                        lines.append(f'    {exp_str};')
                    elif pe.startswith("sup.setResponse") or pe.startswith("setTestContext"):
                        lines.append(f'    {pe};')
                    else:
                        lines.append(f'    await expect({call_str}){pe};')
            else:
                statements = [s.strip() for s in expected_clean.split(";") if s.strip()]
                lines.append(f'    const res: any = await {call_str};')
                lines.append('    const row: any = res;')
                for stmt in statements:
                    if stmt.startswith("expect("):
                        lines.append(f'    {stmt};')
                    elif stmt.startswith("sup.setResponse") or stmt.startswith("setTestContext"):
                        lines.append(f'    {stmt};')

            lines.append('  });')
            lines.append('')
        lines.append('});')
        lines.append('')

    content = "\n".join(lines)
    os.makedirs(os.path.dirname(mf), exist_ok=True)
    with open(mf, "w", encoding="utf-8") as out:
        out.write(content)
    print("Generated:", mf)

print("ALL 6 TEST FILES GENERATED!")
