# External Features User Guide

## Overview
The GOB Configurator now supports adding external features (up/down lights and external sockets) to the front elevation drawing with drag-and-drop positioning.

## Adding External Features

### Step 1: Open External Features Section
In the left configuration panel, scroll to the **"External Features on Drawing"** section (located after "Placed Components").

### Step 2: Add a Feature
Click one of the two buttons:
- **"+ Up/Down Light"** - Adds a wall-mounted exterior light
- **"+ Ext. Socket"** - Adds a weatherproof outdoor socket

### Step 3: Position the Feature
Two ways to position:

**Option A: Drag on Drawing**
1. The feature appears on the front elevation drawing
2. Click and drag horizontally to reposition
3. Release to place
4. Position automatically snaps to 50mm grid

**Option B: Manual Entry**
1. In the feature list, edit the X position value
2. Enter position in millimeters from left edge
3. Use 50mm increments (50, 100, 150, etc.)

### Step 4: Add More Features (Optional)
- Click the add buttons again to add more lights or sockets
- Each feature can be positioned independently
- Lights automatically space themselves (25% and 75% width)
- Sockets default to center (50% width)

### Step 5: Remove Features (Optional)
- Click the **×** button next to any feature in the list
- Feature is immediately removed from drawing

## Feature Details

### Up/Down Lights
- **Appearance**: Anthracite wall-mounted fixture with glass diffusers
- **Size**: 120mm wide × 160mm tall
- **Position**: Fixed at 875mm from top (just below roof line)
- **Movement**: Horizontal only (left/right along wall)

### External Sockets
- **Appearance**: White weatherproof socket box with UK 3-pin socket
- **Size**: 150mm wide × 150mm tall
- **Position**: Fixed at 800mm from ground (standard socket height)
- **Movement**: Horizontal only (left/right along wall)

## Tips & Best Practices

### Smart Positioning
- **Lights**: Alternate between left and right for balanced lighting
- **Sockets**: Consider door placement for accessibility
- **Symmetry**: Use matching pairs for professional appearance

### Grid Snapping
- All positions snap to 50mm grid automatically
- Valid positions: 0, 50, 100, 150, 200, etc.
- Prevents awkward fractional measurements

### Bounds
- Features cannot be dragged outside building width
- Minimum position: 0mm (left edge)
- Maximum position: Building width minus feature width

### Default Positions
When you add features, they appear at smart default positions:
- **First light**: 25% of building width (left side)
- **Second light**: 75% of building width (right side)
- **Sockets**: 50% of building width (centered)

## Saving & Loading

### Automatic Save
External features are automatically saved when you:
- Click "Save" button in header
- Export configuration as JSON

### Automatic Load
External features are automatically restored when you:
- Click "Load" button and select a saved config
- Open a previously saved configuration file

### Backwards Compatibility
- Old configurations without external features still work
- Empty feature list is created automatically
- No data loss when loading older configs

## Drawing Output

### Where Features Appear
- **Front Elevation**: ✅ Features visible on front elevation drawing
- **Side Elevations**: ❌ Features not shown (as designed)
- **Plan View**: ❌ Features not shown (as designed)

### PDF Export
External features are included in:
- ✅ Drawing PDF exports
- ✅ Print preview
- ✅ All exported drawing formats

## Troubleshooting

### Feature Won't Drag
- Make sure you're clicking directly on the feature icon
- Try clicking and holding for 1 second before dragging
- Check that you're dragging horizontally (vertical dragging disabled)

### Feature Disappeared
- Check the "External Features on Drawing" list in config panel
- Feature may be positioned outside visible area
- Use manual position input to reposition

### Position Not Saving
- Ensure position is a valid number
- Use 50mm increments (grid-aligned values)
- Wait for drawing to update after manual input

### Can't Add More Features
- No hard limit on feature quantity
- If button doesn't respond, check browser console for errors
- Try refreshing the page and loading your config

## Examples

### Typical Setup for 5m Building
```
External Features:
- Up/Down Light at 1250mm (left of door)
- Up/Down Light at 3750mm (right of door)
- External Socket at 2500mm (center)
```

### Minimal Setup
```
External Features:
- Up/Down Light at 1250mm (single light, left side)
```

### Maximum Coverage
```
External Features:
- Up/Down Light at 500mm
- Up/Down Light at 2500mm
- Up/Down Light at 4500mm
- External Socket at 1500mm
- External Socket at 3500mm
```

## Technical Notes

### Grid System
- All measurements in millimeters (mm)
- 50mm grid spacing matches doors/windows
- Ensures consistent, professional layouts

### Y Position (Vertical)
- **Fixed by feature type** (not adjustable)
- Lights: 500mm below roof zone
- Sockets: 800mm from ground
- Meets standard installation heights

### Drag Behavior
- Horizontal movement only (Y locked)
- Smooth activation after 3px movement
- Live preview during drag
- Snaps to grid on release

---

**Need Help?**
If features aren't working as expected:
1. Check browser console for errors (F12)
2. Verify you're using a modern browser (Chrome, Firefox, Safari, Edge)
3. Try refreshing the page and reloading your configuration
4. Ensure JavaScript is enabled

**Feature Requests?**
Future enhancements could include:
- Additional feature types (cameras, vents, etc.)
- Adjustable vertical positioning
- Features on side elevations
- Pricing integration

---

**Version**: 1.0
**Last Updated**: 2026-02-13
**Compatible With**: GOB Configurator v2+
