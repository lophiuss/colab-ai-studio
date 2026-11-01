with open('public/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('<div class="lightbox-body">')
end_idx = text.find('</div>', idx) + len('</div>')

replacement = '''<div class="lightbox-body" style="position:relative; display:flex; align-items:center; justify-content:center;">
        <button id="btnLightboxPrev" class="lightbox-nav-btn prev" title="Previous photo (Left arrow key)">◀</button>
        <img id="lightboxImage" class="lightbox-media-img" src="" alt="Full preview" />
        <button id="btnLightboxNext" class="lightbox-nav-btn next" title="Next photo (Right arrow key)">▶</button>
      </div>'''

text = text[:idx] + replacement + text[end_idx:]

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated public/index.html lightbox navigation buttons!')
