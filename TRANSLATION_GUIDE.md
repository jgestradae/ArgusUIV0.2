# Translation Guide - ArgusUI v0.3
## How to Add and Manage Translations

**Last Updated:** November 2025  
**Languages Supported:** Spanish (es), English (en)

---

## 📁 File Structure

```
frontend/src/i18n/
├── config.js                    # i18n configuration
├── locales/
│   ├── es/
│   │   └── translation.json    # Spanish translations (BASE)
│   └── en/
│       └── translation.json    # English translations
```

---

## 🌍 Translation Files

### Spanish (Base Language)
**File:** `/frontend/src/i18n/locales/es/translation.json`

This is the PRIMARY language file. All new keys should be added here first.

### English
**File:** `/frontend/src/i18n/locales/en/translation.json`

Translations must mirror the Spanish file structure.

---

## ✏️ How to Add New Translations

### Step 1: Add Key to Spanish File

Open `/frontend/src/i18n/locales/es/translation.json` and add your new key:

```json
{
  "dashboard": {
    "title": "Panel de Control",
    "welcome": "Bienvenido a ArgusUI",
    "new_key_here": "Tu nuevo texto en español"  // ADD HERE
  }
}
```

### Step 2: Add Corresponding English Translation

Open `/frontend/src/i18n/locales/en/translation.json` and add the same key:

```json
{
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome to ArgusUI",
    "new_key_here": "Your new text in English"  // ADD HERE
  }
}
```

### Step 3: Use in Your Component

```javascript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.new_key_here')}</p>
    </div>
  );
}
```

---

## 📋 Translation Structure

### Naming Convention

Use **dot notation** for hierarchical organization:

```json
{
  "section": {
    "subsection": {
      "key": "value"
    }
  }
}
```

**Access:** `t('section.subsection.key')`

### Current Sections

1. **app** - Application-wide (name, version, footer)
2. **navigation** - Menu items
3. **accessibility** - Accessibility features
4. **auth** - Authentication (login, logout)
5. **dashboard** - Dashboard page
6. **system_status** - System status page
7. **measurements** - Measurements module
8. **amm** - Automatic Measurement Mode
9. **reports** - Reports module
10. **data_navigator** - Data navigator
11. **graphs** - Graph visualizations
12. **forms** - Form labels and validation
13. **messages** - User feedback messages
14. **errors** - Error messages
15. **help** - Help and support
16. **tooltips** - Tooltip texts

---

## 🔄 Dynamic Translations with Variables

### Using Interpolation

**In translation file:**
```json
{
  "welcome_user": "Bienvenido, {{username}}!"
}
```

**In component:**
```javascript
t('welcome_user', { username: user.name })
// Output: "Bienvenido, Juan!"
```

### Pluralization

**In translation file:**
```json
{
  "items_count": "{{count}} elemento",
  "items_count_plural": "{{count}} elementos"
}
```

**In component:**
```javascript
t('items_count', { count: 1 })  // "1 elemento"
t('items_count', { count: 5 })  // "5 elementos"
```

---

## 🎯 Best Practices

### 1. Keep Keys Organized

✅ **Good:**
```json
{
  "forms": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "submit": "Enviar"
  }
}
```

❌ **Bad:**
```json
{
  "save_button": "Guardar",
  "cancel_button": "Cancelar",
  "submit_form": "Enviar"
}
```

### 2. Use Clear, Descriptive Keys

✅ **Good:** `dashboard.welcome`  
❌ **Bad:** `dash_w` or `d1`

### 3. Avoid Hardcoded Text

✅ **Good:**
```javascript
<button>{t('forms.save')}</button>
```

❌ **Bad:**
```javascript
<button>Guardar</button>
```

### 4. Keep Translations Simple

- Use clear, concise language
- Avoid technical jargon
- Write at 8th-grade reading level
- One sentence per key

### 5. Consistent Terminology

Maintain a glossary for technical terms:

| English | Spanish | Notes |
|---------|---------|-------|
| Measurement | Medición | Not "Medida" |
| Spectrum | Espectro | Technical term |
| Station | Estación | Not "Estación de radio" |
| Configuration | Configuración | Full word, not "Config" |

---

## 🧪 Testing Translations

### 1. Visual Check

Switch language in app:
1. Click language selector in toolbar
2. Choose Spanish or English
3. Verify all text changes
4. Check for missing translations (shows key name)

### 2. Check for Missing Keys

Missing translations appear as the key name:
```
// If translation missing:
dashboard.missing_key  // Instead of translated text
```

### 3. Validate JSON

Ensure JSON is valid:
```bash
# Check Spanish file
node -e "require('./frontend/src/i18n/locales/es/translation.json')"

# Check English file
node -e "require('./frontend/src/i18n/locales/en/translation.json')"
```

No output = valid JSON  
Error = syntax issue (missing comma, quote, etc.)

---

## 🔍 Finding Untranslated Text

### Search for Hardcoded Spanish

```bash
cd frontend/src
grep -r "Panel de Control" . --include=\*.js
grep -r "Medición" . --include=\*.js
```

### Search for Hardcoded English

```bash
grep -r "Dashboard" . --include=\*.js --exclude-dir=i18n
grep -r "Measurement" . --include=\*.js --exclude-dir=i18n
```

---

## 📝 Adding a New Language

### Step 1: Create New Locale Folder

```bash
mkdir frontend/src/i18n/locales/fr  # Example: French
touch frontend/src/i18n/locales/fr/translation.json
```

### Step 2: Copy and Translate

Copy Spanish file and translate:
```bash
cp frontend/src/i18n/locales/es/translation.json \
   frontend/src/i18n/locales/fr/translation.json
```

Translate all values to French.

### Step 3: Update Config

Edit `/frontend/src/i18n/config.js`:

```javascript
import translationFR from './locales/fr/translation.json';

const resources = {
  es: { translation: translationES },
  en: { translation: translationEN },
  fr: { translation: translationFR }  // ADD THIS
};
```

### Step 4: Update Language Selector

Edit `/frontend/src/components/AccessibilityToolbar.js`:

```jsx
<button onClick={() => changeLanguage('fr')}>
  <span className="flag-icon">🇫🇷</span>
  Français
</button>
```

---

## 🛠️ Common Issues

### Issue: Translation Not Showing

**Symptoms:** Key name appears instead of translated text

**Solutions:**
1. Check key exists in both language files
2. Verify JSON syntax is valid
3. Check for typos in key name
4. Restart development server
5. Clear browser cache

### Issue: Language Not Switching

**Solutions:**
1. Check localStorage: `localStorage.getItem('i18nextLng')`
2. Clear localStorage: `localStorage.clear()`
3. Verify language selector working
4. Check browser console for errors

### Issue: Special Characters Not Displaying

**Solutions:**
1. Ensure file saved as UTF-8
2. Use Unicode escapes if needed: `\u00f1` for ñ
3. Verify JSON file has UTF-8 encoding

---

## 📊 Translation Coverage

**Current Statistics:**
- Total keys: ~150
- Spanish coverage: 100%
- English coverage: 100%
- Components translated: 25+

**Untranslated Areas:**
- Some third-party library messages
- Dynamic error messages from backend
- Some technical labels in charts

---

## ✅ Translation Checklist

Before committing new translations:

- [ ] Added to both Spanish and English files
- [ ] Keys match in both files
- [ ] JSON syntax is valid
- [ ] Tested in application
- [ ] No hardcoded text in component
- [ ] Used in at least one component
- [ ] Follows naming convention
- [ ] Added to appropriate section
- [ ] Verified with native speaker (if possible)

---

## 📞 Questions?

If you need help with translations:

1. Check this guide first
2. Search existing translations for examples
3. Ask the development team
4. Consult a native Spanish speaker for accuracy

---

**Guide Version:** 1.0  
**Last Updated:** November 2025  
**Maintained By:** ArgusUI Development Team