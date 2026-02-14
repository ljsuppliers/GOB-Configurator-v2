# Quick Start: Version Tracking & Combined Exports

## 🚀 What's New

Your GOB Configurator now automatically tracks versions for all exports!

## How It Works

### Automatic Versioning
Every time you export a PDF or create a Google Sheet for a customer:
1. System checks if this customer has exported before
2. Increments their version number
3. Adds version to filename (v2, v3, etc.)

### First Export
```
GOB Quote - Jane Doe - 15-02-2026.pdf
```
Clean filename, no version number.

### Subsequent Exports
```
GOB Quote - Jane Doe - 15-02-2026 v2.pdf
GOB Quote - Jane Doe - 15-02-2026 v3.pdf
GOB Drawing - Jane Doe - 15-02-2026 v3.pdf
```

### Combined Export
Click **"Export Both (Quote + Drawing)"** to get:
```
GOB Quote - Jane Doe - 15-02-2026 v4.pdf
GOB Drawing - Jane Doe - 15-02-2026 v4.pdf
```
Both files share the same version number!

---

## Button Guide

| Button | What It Does |
|--------|--------------|
| **Export Quote PDF** | Quote only, versioned |
| **Export Drawing PDF** | Drawing only, versioned |
| **Export Both** | Quote + Drawing, matching versions ✨ |
| **Create Google Sheet** | Sheet with versioned title |

---

## FAQ

**Q: How do I reset version numbers?**  
A: Clear browser data or delete the localStorage key for that customer.

**Q: What if I change the customer name?**  
A: It starts a new version series (v1 for the new name).

**Q: Can I export without versions?**  
A: The system always tracks versions, but v1 doesn't show in the filename.

**Q: Where are versions stored?**  
A: In your browser's localStorage (client-side) and `quote-versions.json` (server-side for sheets).

**Q: Will this affect my old quotes?**  
A: No! Completely backwards compatible. Old exports still work.

---

## Tips

✅ **Best Practice:** Use "Export Both" to keep Quote + Drawing versions synchronized

✅ **Professional:** First export has no version number for clean look

✅ **Organized:** Version numbers help track quote revisions

✅ **Automatic:** No manual tracking needed!

---

That's it! Your quote versioning is ready to use. 🎉
