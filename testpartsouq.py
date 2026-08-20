import requests

cookies = {
    'YII_CSRF_TOKEN': 'SUR1bkR0Y0RDTmJzWmozUW9RdU1DUkdMckgzbzEzOEXEYL0WpPr8_F_jBThetHqCRoN3d6xGnKUV9Pw0STCtEA%3D%3D',
    '_ga': 'GA1.1.1070692177.1786002075',
    '_fbp': 'fb.1.1786002075060.62824087494818199',
    '__zlcmid': '1YtoiM7ZmKENgUc',
    'cf_clearance': 'kodFt7oTlE84301uAgB2a5P3xQowSMRO_oeO_3AeJX8-1786002122-1.2.1.1-qZmtWLj0mt5Nia4srq8U_.5JfjoXsXYnES7Nm96B4cVh71ejimr3D3fi6OjGFSGw2jkzRAYXiT7Rt2pZ_j_vFqFEAPFBWxNJjoOfQOHk40BujX8da5R2l1LqzBcIx7u1SbAjPXX.cC3RDrC4OKNkQ7CD_.y7xD1rxlfRAIfjeRPyxA_KXyDPQFQr0ZIxkSOvdxmKMJjcWgLxgN00XJiXGJE0.wuC0H95mI_hKIucMn3SzmKqD0BFWWP7xXEP6dJ.v3u.EyX5qtCVG0CGMojVdp2PArvmMKyfpqRGX2DeC65enMauHSHtjzbseh4.6soMX1DziXM4V669rIuqSiBjVtXVQPDZD8K8jCeLaOeI8P77ehbIreWFIMReDPnNoo0xbajb2Gtm5N0nVPGOTj7VrNj9p1TSAI.PGyxsFO_NpNV83cV5VYqpbDsgxE0KCkBkn20GJEW1cf3reB.Gn3uGHHC9mKxVFcNzf4HAkNlX4kGXDSaswRqddNB_eGx1lLIUP6N.1lk.VsVVItHYiK.QjQ',
    'c30093ac93bb41fdd6908aea40b6a902': 'd021b8d4e2105e320d7569258cb6185558d140b4a%3A4%3A%7Bi%3A0%3Bs%3A6%3A%22510848%22%3Bi%3A1%3Bs%3A24%3A%22aryaaditya9801%40gmail.com%22%3Bi%3A2%3Bi%3A2592000%3Bi%3A3%3Ba%3A1%3A%7Bs%3A2%3A%22id%22%3Bs%3A6%3A%22510848%22%3B%7D%7D',
    'PHPSESSID': '83vvkufhbn0himqo3ch1kl9u6l',
    '_ga_H82D1FCBGJ': 'GS2.1.s1786002074$o1$g1$t1786002142$j55$l0$h0',
}

headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'priority': 'u=0, i',
    'referer': 'https://partsouq.com/en/catalog/genuine/locate?c=BMW',
    'sec-ch-ua': '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
    'sec-ch-ua-arch': '"x86"',
    'sec-ch-ua-bitness': '"64"',
    'sec-ch-ua-full-version': '"151.0.7922.71"',
    'sec-ch-ua-full-version-list': '"Not=A?Brand";v="99.0.0.0", "Google Chrome";v="151.0.7922.71", "Chromium";v="151.0.7922.71"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-model': '""',
    'sec-ch-ua-platform': '"Windows"',
    'sec-ch-ua-platform-version': '"19.0.0"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    # 'cookie': 'YII_CSRF_TOKEN=SUR1bkR0Y0RDTmJzWmozUW9RdU1DUkdMckgzbzEzOEXEYL0WpPr8_F_jBThetHqCRoN3d6xGnKUV9Pw0STCtEA%3D%3D; _ga=GA1.1.1070692177.1786002075; _fbp=fb.1.1786002075060.62824087494818199; __zlcmid=1YtoiM7ZmKENgUc; cf_clearance=kodFt7oTlE84301uAgB2a5P3xQowSMRO_oeO_3AeJX8-1786002122-1.2.1.1-qZmtWLj0mt5Nia4srq8U_.5JfjoXsXYnES7Nm96B4cVh71ejimr3D3fi6OjGFSGw2jkzRAYXiT7Rt2pZ_j_vFqFEAPFBWxNJjoOfQOHk40BujX8da5R2l1LqzBcIx7u1SbAjPXX.cC3RDrC4OKNkQ7CD_.y7xD1rxlfRAIfjeRPyxA_KXyDPQFQr0ZIxkSOvdxmKMJjcWgLxgN00XJiXGJE0.wuC0H95mI_hKIucMn3SzmKqD0BFWWP7xXEP6dJ.v3u.EyX5qtCVG0CGMojVdp2PArvmMKyfpqRGX2DeC65enMauHSHtjzbseh4.6soMX1DziXM4V669rIuqSiBjVtXVQPDZD8K8jCeLaOeI8P77ehbIreWFIMReDPnNoo0xbajb2Gtm5N0nVPGOTj7VrNj9p1TSAI.PGyxsFO_NpNV83cV5VYqpbDsgxE0KCkBkn20GJEW1cf3reB.Gn3uGHHC9mKxVFcNzf4HAkNlX4kGXDSaswRqddNB_eGx1lLIUP6N.1lk.VsVVItHYiK.QjQ; c30093ac93bb41fdd6908aea40b6a902=d021b8d4e2105e320d7569258cb6185558d140b4a%3A4%3A%7Bi%3A0%3Bs%3A6%3A%22510848%22%3Bi%3A1%3Bs%3A24%3A%22aryaaditya9801%40gmail.com%22%3Bi%3A2%3Bi%3A2592000%3Bi%3A3%3Ba%3A1%3A%7Bs%3A2%3A%22id%22%3Bs%3A6%3A%22510848%22%3B%7D%7D; PHPSESSID=83vvkufhbn0himqo3ch1kl9u6l; _ga_H82D1FCBGJ=GS2.1.s1786002074$o1$g1$t1786002142$j55$l0$h0',
}

params = {
    'c': 'BMW',
    'ssd': '$*KwFLf24DHipPFiMBJR5hWRMHJyA-T0BNTF5xQgoMPyg8MDY-bGt7PT0xKiosLTRuaUwmCAwIOS89PGZ8BUhITU46T01IFBsEBw4aFhAbExhgVRAUERtcQ01NTBUaHlsMHFxDWjkvFx8QVVoJFxdaRV93bHM_KkhPSUpPPhccB01NSVwEAAAAAHU8ZxY=$',
    'vid': '979216603',
    'q': 'WBAFR71020C725456',
}

response = requests.get('https://partsouq.com/en/catalog/genuine/vehicle', params=params, cookies=cookies, headers=headers)
print(response.text)
print(response.status_code)

# Save the HTML page
with open("partsouq_vehicle_page.html", "w", encoding="utf-8") as f:
    f.write(response.text)

print("Page saved successfully as 'partsouq_vehicle_page.html'")