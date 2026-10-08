from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    page = browser.new_page()
    page.goto('http://localhost:3000/service', wait_until='domcontentloaded')
    video = page.locator('.service-video-guide__media')
    video.wait_for()
    assert video.get_attribute('src') == '/video/ASC_VIDEO_FIXED_07.10.2026_ER.mp4'
    page.wait_for_function("document.querySelector('.service-video-guide__media').readyState >= 2")
    print(video.evaluate('v => ({source:v.currentSrc,duration:v.duration,width:v.videoWidth,height:v.videoHeight,error:v.error})'))
    assert video.evaluate('v => v.error === null && v.duration > 0 && v.videoWidth > 0')
    video.evaluate('v => { v.muted = true; return v.play(); }')
    page.wait_for_function("document.querySelector('.service-video-guide__media').currentTime > 0")
    print('Verified new service video loads and plays in the popup.')
    browser.close()
