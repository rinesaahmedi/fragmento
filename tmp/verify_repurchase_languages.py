import pathlib
from playwright.sync_api import sync_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parents[1]
cases = [
    ('de', 'Deutsch', 'Text', 'Weiter', 'Bestätigen', 'Wichtiger Hinweis!', 'Diese Küche ist nicht für einen Nachkauf vorgesehen.', 'Verstanden'),
    ('en', 'English', 'Text', 'Continue', 'Confirm', 'Important notice!', 'This kitchen is not intended for additional purchases.', 'Understood'),
    ('tr', 'Türkçe', 'Metin', 'Devam', 'Onayla', 'Önemli bilgilendirme!', 'Bu mutfak için sonradan ek ürün satın alınması öngörülmemiştir.', 'Anladım'),
    ('es', 'Español', 'Texto', 'Continuar', 'Confirmar', '¡Aviso importante!', 'No está previsto realizar compras adicionales para esta cocina.', 'Entendido'),
    ('fr', 'Français', 'Texte', 'Continuer', 'Confirmer', 'Information importante !', 'Aucun achat complémentaire n’est prévu pour cette cuisine.', 'Compris'),
    ('ru', 'Русский', 'Текст', 'Продолжить', 'Подтвердить', 'Важная информация!', 'Для этой кухни не предусмотрена покупка дополнительных элементов.', 'Понятно'),
]
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    for code, language, mode, proceed, confirm, title, message, dismiss in cases:
        context = browser.new_context(viewport={'width': 1440, 'height': 1000})
        page = context.new_page()
        page.goto('http://localhost:3000', wait_until='networkidle')
        cookie = page.get_by_role('button', name='Nur notwendige', exact=True)
        if cookie.count(): cookie.click()
        page.get_by_role('button', name=language, exact=True).click()
        page.get_by_role('button', name=mode, exact=True).click()
        page.get_by_role('button', name=proceed, exact=True).click()
        page.locator('#entry-contract-number').fill('670105650')
        page.get_by_role('button', name=confirm, exact=True).click()
        dialog = page.get_by_role('dialog', name=title, exact=True)
        expect(dialog).to_be_visible()
        expect(dialog).to_have_attribute('lang', code)
        expect(dialog.get_by_text(message, exact=True)).to_be_visible()
        heading = dialog.get_by_role('heading', name=title, exact=True)
        assert heading.evaluate("el => parseFloat(getComputedStyle(el).fontSize)") == 34
        page.screenshot(path=str(ROOT / f'tmp/kitchen-105791/repurchase-{code}.png'))
        page.set_viewport_size({'width': 390, 'height': 844})
        assert dialog.bounding_box()['width'] <= 350
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        dialog.get_by_role('button', name=dismiss, exact=True).click()
        expect(dialog).not_to_be_visible()
        context.close()
    browser.close()
print('Verified all six selected languages, localized title/message/button, larger title, mobile fit and dismissal.')
