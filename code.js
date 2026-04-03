// StyleToToken — Creates Variables from Paint Styles (from scratch)
// Primitives → Semantic → Component → Rebind

figma.skipInvisibleInstanceChildren = false;
figma.showUI(__html__, { width: 353, height: 495, title: 'Styles to Variables' });

// ── Helpers ───────────────────────────────────────────────────────────────────

function rgbToHsl(r, g, b) {
  var max = Math.max(r, g, b);
  var min = Math.min(r, g, b);
  var l = (max + min) / 2;
  var h, s;
  if (max === min) {
    h = 0; s = 0;
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s: s, l: l };
}

function hslToRgb(h, s, l) {
  h = h / 360;
  var r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    var q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p2 = 2 * l - q2;
    r = hue2rgb(p2, q2, h + 1/3);
    g = hue2rgb(p2, q2, h);
    b = hue2rgb(p2, q2, h - 1/3);
  }
  return { r: r, g: g, b: b };
}

function invertL(hsl) {
  var lNew = 1.0 - hsl.l;
  return hslToRgb(hsl.h, hsl.s, lNew);
}

// ── OKLCH dark mode helpers ───────────────────────────────────────────────────

// Invariants — foreground colors that never invert regardless of direction
var SEMANTIC_INVARIANTS = [
  { keys: ['foreground/black'], rgba: { r: 0.0, g: 0.0, b: 0.0, a: 1 } }, // #000000 — Apple/X brand
  { keys: ['foreground/white'], rgba: { r: 1.0, g: 1.0, b: 1.0, a: 1 } }, // #FFFFFF
];

// Direction-specific overrides — only for light-first → dark derivation
var SEMANTIC_DARK_OVERRIDES = [
  { keys: ['base/white'], rgba: { r: 0.067, g: 0.067, b: 0.067, a: 1 } }, // #111111 — surface → dark
  { keys: ['base/black'], rgba: { r: 0.961, g: 0.961, b: 0.961, a: 1 } }, // #F5F5F5 — inverted
];

function detectSemanticInvariant(varName) {
  var lower = varName.toLowerCase().replace(/[-_]/g, '/');
  for (var i = 0; i < SEMANTIC_INVARIANTS.length; i++) {
    var entry = SEMANTIC_INVARIANTS[i];
    for (var j = 0; j < entry.keys.length; j++) {
      if (lower.indexOf(entry.keys[j]) !== -1) {
        return entry.rgba;
      }
    }
  }
  return null;
}

function detectSemanticDark(varName) {
  var invariant = detectSemanticInvariant(varName);
  if (invariant) return invariant;
  var lower = varName.toLowerCase().replace(/[-_]/g, '/');
  for (var i = 0; i < SEMANTIC_DARK_OVERRIDES.length; i++) {
    var entry = SEMANTIC_DARK_OVERRIDES[i];
    for (var j = 0; j < entry.keys.length; j++) {
      if (lower.indexOf(entry.keys[j]) !== -1) {
        return entry.rgba;
      }
    }
  }
  return null;
}

function linearize(v) {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function delinearize(v) {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1/2.4) - 0.055;
}

function rgbToOklab(r, g, b) {
  var lr = linearize(r), lg = linearize(g), lb = linearize(b);
  var l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  var m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  var s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  var lc = Math.cbrt(l), mc = Math.cbrt(m), sc = Math.cbrt(s);
  return {
    L: 0.2104542553 * lc + 0.7936177850 * mc - 0.0040720468 * sc,
    a: 1.9779984951 * lc - 2.4285922050 * mc + 0.4505937099 * sc,
    b: 0.0259040371 * lc + 0.7827717662 * mc - 0.8086757660 * sc
  };
}

function oklabToRgb(L, a, b) {
  var lc = L + 0.3963377774 * a + 0.2158037573 * b;
  var mc = L - 0.1055613458 * a - 0.0638541728 * b;
  var sc = L - 0.0894841775 * a - 1.2914855480 * b;
  var l = lc*lc*lc, m = mc*mc*mc, s = sc*sc*sc;
  var rLin =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  var gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  var bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return {
    r: Math.max(0, Math.min(1, delinearize(rLin))),
    g: Math.max(0, Math.min(1, delinearize(gLin))),
    b: Math.max(0, Math.min(1, delinearize(bLin)))
  };
}

function computeDarkRgba(lightRgba, varName, alpha) {
  var named = detectSemanticDark(varName);
  if (named) {
    return { r: named.r, g: named.g, b: named.b, a: alpha };
  }

  var lab = rgbToOklab(lightRgba.r, lightRgba.g, lightRgba.b);
  var darkL = Math.max(0.08, Math.min(0.92, 1.0 - lab.L * 0.88 + 0.04));
  var origC = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  var darkC = origC * 0.90;
  var darkA = origC > 0.0001 ? lab.a * (darkC / origC) : 0;
  var darkB = origC > 0.0001 ? lab.b * (darkC / origC) : 0;
  var rgb = oklabToRgb(darkL, darkA, darkB);
  return { r: rgb.r, g: rgb.g, b: rgb.b, a: alpha };
}

function computeLightRgba(darkRgba, varName, alpha) {
  var named = detectSemanticInvariant(varName);
  if (named) {
    return { r: named.r, g: named.g, b: named.b, a: alpha };
  }

  var lab = rgbToOklab(darkRgba.r, darkRgba.g, darkRgba.b);
  var lightL = Math.max(0.08, Math.min(0.92, (1.04 - lab.L) / 0.88));
  var origC = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  var lightC = origC / 0.90;
  var lightA = origC > 0.0001 ? lab.a * (lightC / origC) : 0;
  var lightB = origC > 0.0001 ? lab.b * (lightC / origC) : 0;
  var rgb = oklabToRgb(lightL, lightA, lightB);
  return { r: rgb.r, g: rgb.g, b: rgb.b, a: alpha };
}

function mirrorShadePrimitive(primVar, primsByName) {
  var parts = primVar.name.split('/');
  var lastPart = parts[parts.length - 1];
  var shade = parseInt(lastPart, 10);
  if (isNaN(shade) || shade <= 0 || shade >= 1000) return null;
  var mirrorShade = 1000 - shade;
  var prefix = parts.slice(0, -1).join('/');
  return primsByName[prefix + '/' + mirrorShade] || null;
}

function classifyColor(r, g, b) {
  var hsl = rgbToHsl(r, g, b);
  var h = hsl.h;
  var s = hsl.s;
  var l = hsl.l;

  var group;
  if (s < 0.10) {
    group = 'Neutral';
  } else if (h >= 0 && h <= 15 || h >= 345) {
    group = 'Red';
  } else if (h > 15 && h <= 45) {
    group = 'Orange';
  } else if (h > 45 && h <= 65) {
    group = 'Yellow';
  } else if (h > 65 && h <= 150) {
    group = 'Green';
  } else if (h > 150 && h <= 200) {
    group = 'Teal';
  } else if (h > 200 && h <= 260) {
    group = 'Blue';
  } else if (h > 260 && h <= 290) {
    group = 'Purple';
  } else {
    group = 'Pink';
  }

  var shade;
  if (l >= 0.95) shade = 50;
  else if (l >= 0.85) shade = 100;
  else if (l >= 0.75) shade = 200;
  else if (l >= 0.65) shade = 300;
  else if (l >= 0.55) shade = 400;
  else if (l >= 0.45) shade = 500;
  else if (l >= 0.35) shade = 600;
  else if (l >= 0.25) shade = 700;
  else if (l >= 0.15) shade = 800;
  else shade = 900;

  return { group: group, shade: shade };
}

var STRIP_PREFIXES = ['colors', 'color', 'palette', 'styles'];
var GROUP_SHADE_RE = /^[A-Za-z][A-Za-z0-9 ]+(\/[A-Za-z0-9 ]+)+$/;

function sanitizeVarName(name) {
  var sanitized = name
    .replace(/[():.·…&=,]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\/+/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .trim();
  if (!sanitized || /^[-\s/]+$/.test(sanitized)) return null;
  return sanitized;
}

function buildPrimitiveName(styleName, r, g, b, usedNames) {
  // Rule 1: match Group/Shade pattern
  var parts = styleName.split('/');
  if (parts.length >= 2) {
    // Strip leading utility segments
    while (parts.length > 1 && STRIP_PREFIXES.indexOf(parts[0].trim().toLowerCase()) !== -1) {
      parts.shift();
    }
    var candidate = parts.join('/').trim();
    if (GROUP_SHADE_RE.test(candidate)) {
      return resolveCollision(candidate, usedNames);
    }
  }

  // Rule 2: auto-classify by hue
  var cls = classifyColor(r, g, b);
  var base = cls.group + '/' + cls.shade;
  return resolveCollision(base, usedNames);
}

function resolveCollision(name, usedNames) {
  if (!usedNames[name]) return name;
  var i = 2;
  while (usedNames[name + '-' + i]) i++;
  return name + '-' + i;
}

// ── Component helpers (shared by Phase 2 + 3) ────────────────────────────────

function getComponentBase(node) {
  var n = node.parent;
  while (n) {
    if (n.type === 'COMPONENT_SET') {
      return n.name.replace(/^_+/, '').trim();
    }
    if (n.type === 'COMPONENT') {
      var p = n.parent;
      while (p) {
        if (p.type === 'COMPONENT_SET') return p.name.replace(/^_+/, '').trim();
        if (p.type === 'PAGE' || p.type === 'DOCUMENT') break;
        p = p.parent;
      }
      return n.name.replace(/^_+/, '').trim();
    }
    if (n.type === 'PAGE' || n.type === 'DOCUMENT') break;
    n = n.parent;
  }
  return null;
}

function getRole(node, isStroke) {
  if (isStroke) return (node.type === 'VECTOR' || node.type === 'LINE') ? 'Icon' : 'Border';
  if (node.type === 'TEXT')   return 'Text';
  if (node.type === 'VECTOR') return 'Icon';
  return 'Background';
}

function getSuffix(semVarName) {
  if (!semVarName) return 'Default';
  var slash = semVarName.indexOf('/');
  return slash === -1 ? semVarName : semVarName.slice(slash + 1);
}

// ── Theme detection ───────────────────────────────────────────────────────────

function detectTheme(styles) {
  // Method A: keyword scan
  var darkKeywords = ['dark', 'night', 'dim', 'on-dark'];
  var lightKeywords = ['light', 'day', 'white', 'on-light'];

  var darkCount = 0;
  var lightCount = 0;
  var total = styles.length;

  for (var i = 0; i < styles.length; i++) {
    var nameLower = styles[i].name.toLowerCase();
    for (var d = 0; d < darkKeywords.length; d++) {
      if (nameLower.indexOf(darkKeywords[d]) !== -1) { darkCount++; break; }
    }
    for (var l = 0; l < lightKeywords.length; l++) {
      if (nameLower.indexOf(lightKeywords[l]) !== -1) { lightCount++; break; }
    }
  }

  if (total > 0 && darkCount / total >= 0.3) return 'dark';
  if (total > 0 && lightCount / total >= 0.3) return 'light';

  // Method B: luminance distribution
  var lValues = [];
  for (var si = 0; si < styles.length; si++) {
    var paints = styles[si].paints;
    if (!paints || paints.length === 0) continue;
    var paint = paints[0];
    if (paint.type !== 'SOLID') continue;
    var hsl = rgbToHsl(paint.color.r, paint.color.g, paint.color.b);
    lValues.push(hsl.l);
  }

  if (lValues.length > 0) {
    lValues.sort(function(a, b2) { return a - b2; });
    var mid = Math.floor(lValues.length / 2);
    var median = lValues.length % 2 === 0
      ? (lValues[mid - 1] + lValues[mid]) / 2
      : lValues[mid];
    if (median >= 0.5) return 'light';
    return 'dark';
  }

  // Method C: fallback
  console.log('[THEME] Fallback to Light — no clear signal found');
  return 'light';
}

// ── Phase 1: Primitives ───────────────────────────────────────────────────────

function createPrimitives(styles) {
  var logLines = [];
  var colorEntries = [];

  // Extract solid colors
  for (var i = 0; i < styles.length; i++) {
    var style = styles[i];
    var paints = style.paints;

    if (!paints || paints.length === 0) {
      logLines.push('[SKIP] Style "' + style.name + '" has no paints');
      continue;
    }

    var firstSolid = null;
    for (var p = 0; p < paints.length; p++) {
      if (paints[p].type === 'SOLID') { firstSolid = paints[p]; break; }
    }

    if (!firstSolid) {
      logLines.push('[SKIP] Gradient style "' + style.name + '" — not supported in MVP');
      continue;
    }

    if (paints.length > 1) {
      logLines.push('[SKIP] Style "' + style.name + '" has ' + paints.length + ' paints — only first SOLID used');
    }

    var opacity = (firstSolid.opacity !== undefined) ? firstSolid.opacity : 1.0;
    if (opacity < 1.0) {
      logLines.push('[WARN] Style "' + style.name + '" has opacity ' + opacity.toFixed(2) + ' — alpha preserved in Variable');
    }

    colorEntries.push({
      styleId: style.id,
      styleName: style.name,
      r: firstSolid.color.r,
      g: firstSolid.color.g,
      b: firstSolid.color.b,
      a: opacity
    });
  }

  // Deduplication: integer RGB comparison, shorter name wins
  var dedupMap = {};
  for (var ci = 0; ci < colorEntries.length; ci++) {
    var entry = colorEntries[ci];
    var key = Math.round(entry.r * 255) + ',' + Math.round(entry.g * 255) + ',' + Math.round(entry.b * 255);
    if (!dedupMap[key]) {
      dedupMap[key] = entry;
    } else {
      var existing = dedupMap[key];
      if (entry.styleName.length < existing.styleName.length) {
        logLines.push('[DEDUP] Dropped "' + existing.styleName + '" in favor of "' + entry.styleName + '"');
        dedupMap[key] = entry;
      } else {
        logLines.push('[DEDUP] Dropped "' + entry.styleName + '" (duplicate of "' + existing.styleName + '")');
      }
    }
  }

  var uniqueEntries = Object.keys(dedupMap).map(function(k) { return dedupMap[k]; });

  // Build Figma collection — single "Value" mode, no Light/Dark split
  var collection = figma.variables.createVariableCollection('Primitives');
  var mode0Id = collection.modes[0].modeId;
  collection.renameMode(mode0Id, 'Value');
  var valueModeId = mode0Id;

  var varByStyleId = {};
  var rgbaByStyleId = {};
  var primsByName = {};
  var usedNames = {};

  for (var ui = 0; ui < uniqueEntries.length; ui++) {
    var ue = uniqueEntries[ui];
    var name = buildPrimitiveName(ue.styleName, ue.r, ue.g, ue.b, usedNames);
    var safeName = sanitizeVarName(name);
    if (!safeName) {
      logLines.push('[SKIP] Invalid primitive variable name after sanitize: "' + name + '"');
      continue;
    }
    usedNames[safeName] = true;

    var variable = figma.variables.createVariable(safeName, collection, 'COLOR');
    variable.setValueForMode(valueModeId, { r: ue.r, g: ue.g, b: ue.b, a: ue.a });

    varByStyleId[ue.styleId] = variable;
    rgbaByStyleId[ue.styleId] = { r: ue.r, g: ue.g, b: ue.b, a: ue.a };
    primsByName[safeName] = variable;
  }

  // Also map duplicate styleIds to their winning variable
  for (var di = 0; di < colorEntries.length; di++) {
    var de = colorEntries[di];
    if (!varByStyleId[de.styleId]) {
      var dKey = Math.round(de.r * 255) + ',' + Math.round(de.g * 255) + ',' + Math.round(de.b * 255);
      var winner = dedupMap[dKey];
      if (winner) {
        varByStyleId[de.styleId] = varByStyleId[winner.styleId];
        rgbaByStyleId[de.styleId] = rgbaByStyleId[winner.styleId];
      }
    }
  }

  return {
    collection: collection,
    valueModeId: valueModeId,
    varByStyleId: varByStyleId,
    rgbaByStyleId: rgbaByStyleId,
    primsByName: primsByName,
    logLines: logLines,
    count: uniqueEntries.length
  };
}

// ── Phase 2: Semantic ─────────────────────────────────────────────────────────
// Creates Semantic variables from actual component usage context.
// Each unique (role, primitiveVar) pair → one Semantic variable.
// e.g. Brand/600 used as stroke → Semantic "Border/Brand-600"

async function createSemantic(allNodes, varByStyleId, rgbaByStyleId, canonicalTheme, primsByName) {
  var logLines = [];

  var collection = figma.variables.createVariableCollection('Semantic');
  var mode0Id = collection.modes[0].modeId;
  var semLightModeId, semDarkModeId;

  if (canonicalTheme === 'light') {
    collection.renameMode(mode0Id, 'Light');
    semLightModeId = mode0Id;
    semDarkModeId = collection.addMode('Dark');
  } else {
    collection.renameMode(mode0Id, 'Dark');
    semDarkModeId = mode0Id;
    semLightModeId = collection.addMode('Light');
  }

  // semByRoleKey: "{role}|{primVarId}" → semVar (dedup guard)
  // semByFillContextKey: "{role}|{styleId}" → semVar (for Phase 3 + 4)
  // semByStrokeContextKey: "{role}|{styleId}" → semVar
  var semByRoleKey = {};
  var semByFillContextKey = {};
  var semByStrokeContextKey = {};

  function ensureSemVar(role, primVar, sourceRgba) {
    var roleKey = role + '|' + primVar.id;
    if (!semByRoleKey[roleKey]) {
      // "Brand/600" → "Brand-600"
      var primSuffix = primVar.name.replace(/\//g, '-');
      var semName = role + '/' + primSuffix;
      var safeName = sanitizeVarName(semName);
      if (!safeName) {
        logLines.push('[SKIP] Invalid semantic name: "' + semName + '"');
        return null;
      }
      var semVar = figma.variables.createVariable(safeName, collection, 'COLOR');
      var mirrorPrim = mirrorShadePrimitive(primVar, primsByName);
      var mirrorBound = false;

      if (canonicalTheme === 'light') {
        // source IS light → Light = alias, Dark = computed
        semVar.setValueForMode(semLightModeId, { type: 'VARIABLE_ALIAS', id: primVar.id });
        if (mirrorPrim) {
          try {
            semVar.setValueForMode(semDarkModeId, figma.variables.createVariableAlias(mirrorPrim));
            mirrorBound = true;
          } catch(e) { logLines.push('[WARN] Mirror alias failed for "' + (mirrorPrim && mirrorPrim.name || '?') + '": ' + e.message); }
        }
        if (!mirrorBound) {
          semVar.setValueForMode(semDarkModeId, computeDarkRgba(sourceRgba, safeName, sourceRgba.a));
        }
      } else {
        // source IS dark → Dark = alias, Light = computed
        semVar.setValueForMode(semDarkModeId, { type: 'VARIABLE_ALIAS', id: primVar.id });
        if (mirrorPrim) {
          try {
            semVar.setValueForMode(semLightModeId, figma.variables.createVariableAlias(mirrorPrim));
            mirrorBound = true;
          } catch(e) { logLines.push('[WARN] Mirror alias failed for "' + (mirrorPrim && mirrorPrim.name || '?') + '": ' + e.message); }
        }
        if (!mirrorBound) {
          semVar.setValueForMode(semLightModeId, computeLightRgba(sourceRgba, safeName, sourceRgba.a));
        }
      }

      semByRoleKey[roleKey] = semVar;
    }
    return semByRoleKey[roleKey];
  }

  // First pass: nodes inside components (preferred — they have intentional naming)
  for (var ni = 0; ni < allNodes.length; ni++) {
    var node = allNodes[ni];
    var compBase = getComponentBase(node);
    if (!compBase) continue;

    var fid = ('fillStyleId' in node && node.fillStyleId !== figma.mixed) ? node.fillStyleId : null;
    if (fid && varByStyleId[fid] && rgbaByStyleId[fid]) {
      var role = getRole(node, false);
      var sv = ensureSemVar(role, varByStyleId[fid], rgbaByStyleId[fid]);
      if (sv) semByFillContextKey[role + '|' + fid] = sv;
    }

    var stid = ('strokeStyleId' in node && node.strokeStyleId !== figma.mixed) ? node.strokeStyleId : null;
    if (stid && varByStyleId[stid] && rgbaByStyleId[stid]) {
      var sRole = getRole(node, true);
      var sv2 = ensureSemVar(sRole, varByStyleId[stid], rgbaByStyleId[stid]);
      if (sv2) semByStrokeContextKey[sRole + '|' + stid] = sv2;
    }

    if (ni % 100 === 0) await new Promise(function(r) { setTimeout(r, 0); });
  }

  // Fallback: if no component nodes found (e.g. re-run after component-only rebind cleared fillStyleIds),
  // use all remaining nodes so Semantic collection is not empty
  if (Object.keys(semByRoleKey).length === 0) {
    for (var fi = 0; fi < allNodes.length; fi++) {
      var fNode = allNodes[fi];
      var ffid = ('fillStyleId' in fNode && fNode.fillStyleId !== figma.mixed) ? fNode.fillStyleId : null;
      if (ffid && varByStyleId[ffid] && rgbaByStyleId[ffid]) {
        var fRole = getRole(fNode, false);
        var fsv = ensureSemVar(fRole, varByStyleId[ffid], rgbaByStyleId[ffid]);
        if (fsv) semByFillContextKey[fRole + '|' + ffid] = fsv;
      }
      var fstid = ('strokeStyleId' in fNode && fNode.strokeStyleId !== figma.mixed) ? fNode.strokeStyleId : null;
      if (fstid && varByStyleId[fstid] && rgbaByStyleId[fstid]) {
        var fsRole = getRole(fNode, true);
        var fsv2 = ensureSemVar(fsRole, varByStyleId[fstid], rgbaByStyleId[fstid]);
        if (fsv2) semByStrokeContextKey[fsRole + '|' + fstid] = fsv2;
      }
      if (fi % 100 === 0) await new Promise(function(r) { setTimeout(r, 0); });
    }
  }

  return {
    collection: collection,
    semLightModeId: semLightModeId,
    semDarkModeId: semDarkModeId,
    semByFillContextKey: semByFillContextKey,
    semByStrokeContextKey: semByStrokeContextKey,
    logLines: logLines,
    count: Object.keys(semByRoleKey).length
  };
}

// ── Phase 3: Component tokens ─────────────────────────────────────────────────
// Creates Component variables from actual component node usage.
// Pattern: {ComponentBase}/{Role}/{Suffix} e.g. "Checkbox/Border/Brand-600"

async function createComponents(allNodes, semByFillContextKey, semByStrokeContextKey) {
  var logLines = [];

  var collection = figma.variables.createVariableCollection('Component');
  var defaultModeId = collection.modes[0].modeId;
  collection.renameMode(defaultModeId, 'Default');

  // compBySlotKey: "{compBase}|{role}" → compVar (dedup — one token per slot)
  // compByFillLookupKey: "{compBase}|{role}" → compVar (for Phase 4)
  // compByStrokeLookupKey: same but for strokes
  var compBySlotKey = {};
  var compByFillLookupKey = {};
  var compByStrokeLookupKey = {};

  for (var ni = 0; ni < allNodes.length; ni++) {
    var node = allNodes[ni];
    var compBase = getComponentBase(node);
    if (!compBase) continue;

    // Fills
    var fid = ('fillStyleId' in node && node.fillStyleId !== figma.mixed) ? node.fillStyleId : null;
    if (fid) {
      var role = getRole(node, false);
      var semVar = semByFillContextKey[role + '|' + fid];
      if (semVar) {
        var tokenName = compBase + '/' + role;
        var slotKey = compBase + '|' + role;
        var safeName = sanitizeVarName(tokenName);
        if (safeName) {
          if (!compBySlotKey[slotKey]) {
            var cv = figma.variables.createVariable(safeName, collection, 'COLOR');
            cv.setValueForMode(defaultModeId, { type: 'VARIABLE_ALIAS', id: semVar.id });
            compBySlotKey[slotKey] = cv;
          }
          compByFillLookupKey[slotKey] = compBySlotKey[slotKey];
        }
      }
    }

    // Strokes
    var stid = ('strokeStyleId' in node && node.strokeStyleId !== figma.mixed) ? node.strokeStyleId : null;
    if (stid) {
      var sRole = getRole(node, true);
      var semVar2 = semByStrokeContextKey[sRole + '|' + stid];
      if (semVar2) {
        var tokenName2 = compBase + '/' + sRole;
        var slotKey2 = compBase + '|' + sRole;
        var safeName2 = sanitizeVarName(tokenName2);
        if (safeName2) {
          if (!compBySlotKey[slotKey2]) {
            var cv2 = figma.variables.createVariable(safeName2, collection, 'COLOR');
            cv2.setValueForMode(defaultModeId, { type: 'VARIABLE_ALIAS', id: semVar2.id });
            compBySlotKey[slotKey2] = cv2;
          }
          compByStrokeLookupKey[slotKey2] = compBySlotKey[slotKey2];
        }
      }
    }

    if (ni % 50 === 0) await new Promise(function(r) { setTimeout(r, 0); });
  }

  return {
    collection: collection,
    compByFillLookupKey: compByFillLookupKey,
    compByStrokeLookupKey: compByStrokeLookupKey,
    logLines: logLines,
    count: Object.keys(compBySlotKey).length
  };
}

// ── Phase 4: Rebind nodes ─────────────────────────────────────────────────────

var ALL_FILL_ROLES = ['Background', 'Text', 'Icon'];
var ALL_STROKE_ROLES = ['Border', 'Icon'];

function findSemVarFallback(contextKey, styleId, roles) {
  for (var ri = 0; ri < roles.length; ri++) {
    var v = contextKey[roles[ri] + '|' + styleId];
    if (v) return v;
  }
  return null;
}

async function rebindNodes(semByFillContextKey, semByStrokeContextKey, allNodes, scope) {
  var stats = { rebound: 0, skipped: 0, errors: 0 };
  var logLines = [];
  var CHUNK = 50;
  var rebindAll = scope === 'all';

  for (var i = 0; i < allNodes.length; i++) {
    var node = allNodes[i];

    if (node.locked) {
      stats.skipped++;
      continue;
    }

    var compBase = getComponentBase(node);
    if (!rebindAll && !compBase) { stats.skipped++; continue; }

    try {
      // Fills
      var fid = ('fillStyleId' in node && node.fillStyleId !== figma.mixed) ? node.fillStyleId : null;
      if (fid) {
        var fRole = getRole(node, false);
        var targetVar = semByFillContextKey[fRole + '|' + fid];
        if (!targetVar && rebindAll) {
          targetVar = findSemVarFallback(semByFillContextKey, fid, ALL_FILL_ROLES);
        }
        if (!targetVar) {
          stats.skipped++;
          if (rebindAll) {
            logLines.push('[SKIP] No Semantic var for fill "' + (node.name || node.id) + '" (styleId: ' + fid + ')');
          }
        } else {
          var fills = node.fills;
          if (Array.isArray(fills) && fills.length > 0 && fills[0].type === 'SOLID') {
            var fillsCopy = fills.slice();
            var newPaint = figma.variables.setBoundVariableForPaint(fillsCopy[0], 'color', targetVar);
            if (newPaint) {
              fillsCopy[0] = newPaint;
              node.fills = fillsCopy;
              await node.setFillStyleIdAsync('');
              stats.rebound++;
            } else {
              stats.skipped++;
            }
          } else {
            stats.skipped++;
          }
        }
      }

      // Strokes
      var stid = ('strokeStyleId' in node && node.strokeStyleId !== figma.mixed) ? node.strokeStyleId : null;
      if (stid) {
        var sRole = getRole(node, true);
        var strokeTargetVar = semByStrokeContextKey[sRole + '|' + stid];
        if (!strokeTargetVar && rebindAll) {
          strokeTargetVar = findSemVarFallback(semByStrokeContextKey, stid, ALL_STROKE_ROLES);
        }
        if (!strokeTargetVar) {
          stats.skipped++;
          if (rebindAll) {
            logLines.push('[SKIP] No Semantic var for stroke "' + (node.name || node.id) + '" (styleId: ' + stid + ')');
          }
        } else {
          var strokes = node.strokes;
          if (Array.isArray(strokes) && strokes.length > 0 && strokes[0].type === 'SOLID') {
            var strokesCopy = strokes.slice();
            var newStrokePaint = figma.variables.setBoundVariableForPaint(strokesCopy[0], 'color', strokeTargetVar);
            if (newStrokePaint) {
              strokesCopy[0] = newStrokePaint;
              node.strokes = strokesCopy;
              await node.setStrokeStyleIdAsync('');
              stats.rebound++;
            } else {
              stats.skipped++;
            }
          } else {
            stats.skipped++;
          }
        }
      }
    } catch (e) {
      stats.errors++;
      if (e.message && e.message.indexOf('instance') !== -1) {
        logLines.push('[REBIND] Cannot bind instance child — skip: ' + node.name);
      } else {
        logLines.push('[REBIND] Error on "' + (node.name || node.id) + '": ' + e.message);
      }
    }

    if (i % CHUNK === 0) {
      figma.ui.postMessage({ type: 'progress', current: i + 1, total: allNodes.length });
      await new Promise(function(r) { setTimeout(r, 0); });
    }
  }

  return { stats: stats, logLines: logLines };
}

// ── Load all styled nodes ─────────────────────────────────────────────────────

async function loadAllNodes() {
  await figma.loadAllPagesAsync();
  var allNodes = figma.root.findAll(function(n) {
    return ('fillStyleId' in n && n.fillStyleId && n.fillStyleId !== figma.mixed) ||
           ('strokeStyleId' in n && n.strokeStyleId && n.strokeStyleId !== figma.mixed);
  });
  return allNodes;
}

// ── Build log text ────────────────────────────────────────────────────────────

function buildLogText(allLogs, stats) {
  var lines = [];
  var now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  lines.push('STYLETOTOKEN — LOG');
  lines.push('Generated: ' + now);
  lines.push('');
  lines.push('=== SUMMARY ===');
  lines.push('Primitives created: ' + (stats.primitives || 0));
  lines.push('Semantic created:   ' + (stats.semantic || 0));
  lines.push('Component tokens:   ' + (stats.components || 0));
  lines.push('Nodes rebound:      ' + (stats.rebound || 0));
  lines.push('Nodes skipped:      ' + (stats.skipped || 0));
  lines.push('');
  lines.push('=== DETAIL ===');
  for (var i = 0; i < allLogs.length; i++) lines.push(allLogs[i]);
  return lines.join('\n');
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

var pendingRun = false;

// State persisted between Phase A and Phase B within the same plugin session.
// Cleared on each new Phase A run.
var phaseAState = null;

async function runPlugin(overrideTheme) {
  try {
    var styles = await figma.getLocalPaintStylesAsync();

    if (styles.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'No Paint Styles found in this file. StyleToToken requires at least one Paint Style.' });
      return;
    }

    // Check existing variables
    var existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
    if (existingCollections.length > 0) {
      figma.ui.postMessage({ type: 'confirm_existing', count: existingCollections.length });
      pendingRun = true;
      return;
    }

    await executePhaseA(styles, overrideTheme);
  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: e.message });
    console.error(e);
  }
}

async function executePhaseA(styles, overrideTheme) {
  phaseAState = null;
  var allLogs = [];

  try {
    // Phase 1 — Primitives
    figma.ui.postMessage({ type: 'phase', phase: 1, done: false });
    figma.ui.postMessage({ type: 'status', message: 'Creating Primitives...' });

    var canonicalTheme = overrideTheme || detectTheme(styles);
    var primResult = createPrimitives(styles);
    allLogs = allLogs.concat(primResult.logLines);

    figma.ui.postMessage({ type: 'stats', primitives: primResult.count, semantic: 0, components: 0, nodes: 0 });
    figma.ui.postMessage({ type: 'phase', phase: 1, done: true });

    // Phase 2 — Semantic
    figma.ui.postMessage({ type: 'phase', phase: 2, done: false });
    figma.ui.postMessage({ type: 'status', message: 'Creating Semantic layer...' });

    var allNodes = await loadAllNodes();

    var semResult = await createSemantic(allNodes, primResult.varByStyleId, primResult.rgbaByStyleId, canonicalTheme, primResult.primsByName);
    allLogs = allLogs.concat(semResult.logLines);

    figma.ui.postMessage({ type: 'stats', primitives: primResult.count, semantic: semResult.count, components: 0, nodes: 0 });
    figma.ui.postMessage({ type: 'phase', phase: 2, done: true });

    // Phase 3 — Component tokens
    figma.ui.postMessage({ type: 'phase', phase: 3, done: false });
    figma.ui.postMessage({ type: 'status', message: 'Creating Component tokens...' });

    var compResult = await createComponents(
      allNodes,
      semResult.semByFillContextKey,
      semResult.semByStrokeContextKey
    );
    allLogs = allLogs.concat(compResult.logLines);

    figma.ui.postMessage({ type: 'stats', primitives: primResult.count, semantic: semResult.count, components: compResult.count, nodes: 0 });
    figma.ui.postMessage({ type: 'phase', phase: 3, done: true });

    // Read accurate counts from actual collections (handles edge cases where some were skipped)
    var finalCollections = await figma.variables.getLocalVariableCollectionsAsync();
    var primColl = finalCollections.find(function(c) { return c.name === 'Primitives'; });
    var semColl = finalCollections.find(function(c) { return c.name === 'Semantic'; });
    var compColl = finalCollections.find(function(c) { return c.name === 'Component'; });
    var accurateStats = {
      primitives: primColl ? primColl.variableIds.length : primResult.count,
      semantic: semColl ? semColl.variableIds.length : semResult.count,
      components: compColl ? compColl.variableIds.length : compResult.count
    };

    // Save state for Phase B
    phaseAState = {
      allLogs: allLogs,
      allNodes: allNodes,
      semByFillContextKey: semResult.semByFillContextKey,
      semByStrokeContextKey: semResult.semByStrokeContextKey,
      primitives: accurateStats.primitives,
      semantic: accurateStats.semantic,
      components: accurateStats.components
    };

    figma.root.setPluginData('styletotoken-v1', 'true');


    var componentNodes = figma.root.findAllWithCriteria({ types: ['COMPONENT'] });
    figma.ui.postMessage({
      type: 'phase_a_complete',
      primitives: accurateStats.primitives,
      semantic: accurateStats.semantic,
      components: accurateStats.components,
      componentCount: componentNodes.length
    });

  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: e.message });
    console.error(e);
  }
}

// Rebuild context maps from Semantic collection + Paint Styles using COLOR matching.
// Color-based matching handles deduplicated styles (multiple styles sharing one Primitive).
// Works regardless of node state — does not require any fillStyleId to still be set.
async function buildContextMapsFromCollections() {
  var result = { semByFillContextKey: {}, semByStrokeContextKey: {} };

  var allCollections = await figma.variables.getLocalVariableCollectionsAsync();
  var semColl = allCollections.find(function(c) { return c.name === 'Semantic'; });
  var primColl = allCollections.find(function(c) { return c.name === 'Primitives'; });
  if (!semColl || !primColl) return result;

  var allVars = await figma.variables.getLocalVariablesAsync('COLOR');
  var primVarById = {};
  allVars.forEach(function(v) {
    if (v.variableCollectionId === primColl.id) primVarById[v.id] = v;
  });
  var semVars = allVars.filter(function(v) { return v.variableCollectionId === semColl.id; });

  // Get color of each Primitive from its 'Value' mode
  var valueModeId = primColl.modes[0].modeId;
  var colorKeyByPrimVarId = {};
  Object.keys(primVarById).forEach(function(pid) {
    var val = primVarById[pid].valuesByMode[valueModeId];
    if (val && val.r !== undefined) {
      colorKeyByPrimVarId[pid] =
        Math.round(val.r * 255) + ',' + Math.round(val.g * 255) + ',' + Math.round(val.b * 255);
    }
  });

  // Find Light mode of Semantic collection
  var lightMode = semColl.modes.find(function(m) { return m.name.toLowerCase() === 'light'; });
  if (!lightMode) lightMode = semColl.modes[0];

  // Build colorKey → { role: semVar }
  var STROKE_ROLES = { 'Border': true, 'Icon': true };
  var semByColorAndRole = {};
  semVars.forEach(function(semVar) {
    var val = semVar.valuesByMode[lightMode.modeId];
    if (!val || val.type !== 'VARIABLE_ALIAS') return;
    var colorKey = colorKeyByPrimVarId[val.id];
    if (!colorKey) return;
    var role = semVar.name.split('/')[0];
    if (!semByColorAndRole[colorKey]) semByColorAndRole[colorKey] = {};
    if (!semByColorAndRole[colorKey][role]) semByColorAndRole[colorKey][role] = semVar;
  });

  // For each Paint Style: match by fill color → emit role|styleId entries for all roles found
  var styles = await figma.getLocalPaintStylesAsync();
  styles.forEach(function(style) {
    if (!style.paints || style.paints.length === 0 || style.paints[0].type !== 'SOLID') return;
    var c = style.paints[0].color;
    var colorKey = Math.round(c.r * 255) + ',' + Math.round(c.g * 255) + ',' + Math.round(c.b * 255);
    var roleMap = semByColorAndRole[colorKey];
    if (!roleMap) return;
    Object.keys(roleMap).forEach(function(role) {
      var semVar = roleMap[role];
      var key = role + '|' + style.id;
      if (STROKE_ROLES[role]) {
        if (!result.semByStrokeContextKey[key]) result.semByStrokeContextKey[key] = semVar;
      } else {
        if (!result.semByFillContextKey[key]) result.semByFillContextKey[key] = semVar;
      }
    });
  });

  return result;
}

async function buildContextMapsFromNodes(allNodes) {
  var semByFillContextKey = {};
  var semByStrokeContextKey = {};
  var boundVars = await figma.variables.getLocalVariablesAsync('COLOR');
  var semVarById = {};
  boundVars.forEach(function(v) { semVarById[v.id] = v; });

  for (var ni = 0; ni < allNodes.length; ni++) {
    var node = allNodes[ni];
    var fid = ('fillStyleId' in node && node.fillStyleId && node.fillStyleId !== figma.mixed) ? node.fillStyleId : null;
    if (fid) {
      var role = getRole(node, false);
      var key = role + '|' + fid;
      if (!semByFillContextKey[key]) {
        var fills = node.fills;
        if (Array.isArray(fills) && fills.length > 0) {
          var binding = fills[0] && fills[0].boundVariables && fills[0].boundVariables.color;
          if (binding && semVarById[binding.id]) {
            semByFillContextKey[key] = semVarById[binding.id];
          }
        }
      }
    }
    var stid = ('strokeStyleId' in node && node.strokeStyleId && node.strokeStyleId !== figma.mixed) ? node.strokeStyleId : null;
    if (stid) {
      var sRole = getRole(node, true);
      var sKey = sRole + '|' + stid;
      if (!semByStrokeContextKey[sKey]) {
        var strokes = node.strokes;
        if (Array.isArray(strokes) && strokes.length > 0) {
          var sBinding = strokes[0] && strokes[0].boundVariables && strokes[0].boundVariables.color;
          if (sBinding && semVarById[sBinding.id]) {
            semByStrokeContextKey[sKey] = semVarById[sBinding.id];
          }
        }
      }
    }
    if (ni % 100 === 0) await new Promise(function(r) { setTimeout(r, 0); });
  }
  return { semByFillContextKey: semByFillContextKey, semByStrokeContextKey: semByStrokeContextKey };
}

async function executeRebindOnly(scope) {
  var allCollections = await figma.variables.getLocalVariableCollectionsAsync();
  var primColl = allCollections.find(function(c) { return c.name === 'Primitives'; });
  var semColl = allCollections.find(function(c) { return c.name === 'Semantic'; });
  var compColl = allCollections.find(function(c) { return c.name === 'Component'; });

  var rebindScope = scope === 'all' ? 'all' : 'components';
  var allLogs = [];

  try {
    figma.ui.postMessage({ type: 'phase', phase: 4, done: false });
    figma.ui.postMessage({ type: 'status', message: 'Scanning nodes for rebinding...' });

    var allNodes = await loadAllNodes();

    // Primary: rebuild from Semantic collection + Paint Styles (works regardless of node state)
    var maps = await buildContextMapsFromCollections();

    // Supplement with any entries found on nodes with both fillStyleId + bound variable
    var nodeMaps = await buildContextMapsFromNodes(allNodes);
    Object.keys(nodeMaps.semByFillContextKey).forEach(function(k) {
      if (!maps.semByFillContextKey[k]) maps.semByFillContextKey[k] = nodeMaps.semByFillContextKey[k];
    });
    Object.keys(nodeMaps.semByStrokeContextKey).forEach(function(k) {
      if (!maps.semByStrokeContextKey[k]) maps.semByStrokeContextKey[k] = nodeMaps.semByStrokeContextKey[k];
    });

    figma.ui.postMessage({ type: 'status', message: 'Rebinding nodes...' });

    var rebindResult = await rebindNodes(maps.semByFillContextKey, maps.semByStrokeContextKey, allNodes, rebindScope);
    allLogs = allLogs.concat(rebindResult.logLines);

    figma.ui.postMessage({ type: 'phase', phase: 4, done: true });

    var finalStats = {
      primitives: primColl ? primColl.variableIds.length : 0,
      semantic: semColl ? semColl.variableIds.length : 0,
      components: compColl ? compColl.variableIds.length : 0,
      rebound: rebindResult.stats.rebound,
      skipped: rebindResult.stats.skipped + rebindResult.stats.errors
    };

    var logText = buildLogText(allLogs, finalStats);
    var hasSkipped = finalStats.skipped > 0 || allLogs.some(function(l) { return l.indexOf('[SKIP]') !== -1; });

    figma.ui.postMessage({
      type: 'done',
      primitives: finalStats.primitives,
      semantic: finalStats.semantic,
      components: finalStats.components,
      rebound: finalStats.rebound,
      skipped: finalStats.skipped,
      scope: rebindScope,
      logText: hasSkipped ? logText : ''
    });

  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: e.message });
    console.error(e);
  }
}

async function executePhaseB(scope) {
  if (!phaseAState) {
    figma.ui.postMessage({ type: 'error', message: 'Phase A has not been run in this session. Please run Phase A first.' });
    return;
  }

  var rebindScope = scope === 'all' ? 'all' : 'components';
  var allLogs = phaseAState.allLogs.slice();

  try {
    // Phase 4 — Rebind
    figma.ui.postMessage({ type: 'phase', phase: 4, done: false });
    figma.ui.postMessage({ type: 'status', message: 'Rebinding nodes...' });

    var rebindResult = await rebindNodes(phaseAState.semByFillContextKey, phaseAState.semByStrokeContextKey, phaseAState.allNodes, rebindScope);
    allLogs = allLogs.concat(rebindResult.logLines);

    figma.ui.postMessage({ type: 'phase', phase: 4, done: true });

    var finalStats = {
      primitives: phaseAState.primitives,
      semantic: phaseAState.semantic,
      components: phaseAState.components,
      rebound: rebindResult.stats.rebound,
      skipped: rebindResult.stats.skipped + rebindResult.stats.errors
    };

    var logText = buildLogText(allLogs, finalStats);
    var hasSkipped = finalStats.skipped > 0 || allLogs.some(function(l) { return l.indexOf('[SKIP]') !== -1; });

    figma.ui.postMessage({
      type: 'done',
      primitives: finalStats.primitives,
      semantic: finalStats.semantic,
      components: finalStats.components,
      rebound: finalStats.rebound,
      skipped: finalStats.skipped,
      scope: rebindScope,
      logText: hasSkipped ? logText : ''
    });

  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: e.message });
    console.error(e);
  }
}

// ── Message handler ───────────────────────────────────────────────────────────

async function executeScan() {
  await figma.loadAllPagesAsync();
  var styles = await figma.getLocalPaintStylesAsync();
  var allCollections = await figma.variables.getLocalVariableCollectionsAsync();
  var existingCount = allCollections.length;
  var detectedTheme = detectTheme(styles);
  var componentNodes = figma.root.findAllWithCriteria({ types: ['COMPONENT'] });
  var existingPluginCollections = allCollections.filter(function(c) {
    return c.name === 'Primitives' || c.name === 'Semantic' || c.name === 'Component';
  });
  var alreadyProcessed = figma.root.getPluginData('styletotoken-v1') === 'true';
  if (alreadyProcessed) {
    var counts = {};
    existingPluginCollections.forEach(function(c) { counts[c.name] = c.variableIds.length; });
    var totalVars = (counts['Primitives'] || 0) + (counts['Semantic'] || 0) + (counts['Component'] || 0);
    // pluginData is not undoable — if flag is set but collections are empty, the user rolled back.
    // Reset stale flag and treat as fresh file.
    if (totalVars === 0) {
      figma.root.setPluginData('styletotoken-v1', '');
      figma.ui.postMessage({ type: 'detected_theme', theme: detectedTheme });
      figma.ui.postMessage({ type: 'scan_results', styleCount: styles.length, existingCollections: existingCount, componentCount: componentNodes.length });
      return;
    }
    figma.ui.postMessage({
      type: 'already_processed',
      primitives: counts['Primitives'] || 0,
      semantic: counts['Semantic'] || 0,
      components: counts['Component'] || 0,
      componentCount: componentNodes.length,
      styleCount: styles.length
    });
    return;
  }
  figma.ui.postMessage({ type: 'detected_theme', theme: detectedTheme });
  figma.ui.postMessage({ type: 'scan_results', styleCount: styles.length, existingCollections: existingCount, componentCount: componentNodes.length });
}

var pendingOverrideTheme = null;

async function executeUpdateMigration() {
  try {
    var allCollections = await figma.variables.getLocalVariableCollectionsAsync();
    var primColl = allCollections.find(function(c) { return c.name === 'Primitives'; });
    var semColl  = allCollections.find(function(c) { return c.name === 'Semantic'; });

    // No existing collections — do a full fresh run
    if (!primColl || !semColl) {
      allCollections
        .filter(function(c) { return ['Primitives', 'Semantic', 'Component'].indexOf(c.name) !== -1; })
        .forEach(function(c) { c.remove(); });
      figma.root.setPluginData('styletotoken-v1', '');
      var freshStyles = await figma.getLocalPaintStylesAsync();
      await executePhaseA(freshStyles, detectTheme(freshStyles));
      return;
    }

    // ── Preserve Semantic + Component; only re-create Primitives ──────────────
    figma.ui.postMessage({ type: 'phase', phase: 1, done: false });
    figma.ui.postMessage({ type: 'status', message: 'Updating Primitives...' });

    // Step 1: capture old Primitive name for each Semantic alias (by var ID)
    var allVars = await figma.variables.getLocalVariablesAsync('COLOR');
    var oldPrimById = {};
    allVars.filter(function(v) { return v.variableCollectionId === primColl.id; })
      .forEach(function(v) { oldPrimById[v.id] = v; });

    var lightMode = semColl.modes.find(function(m) { return m.name.toLowerCase() === 'light'; }) || semColl.modes[0];
    var darkMode  = semColl.modes.find(function(m) { return m.name.toLowerCase() === 'dark'; });
    var semVars   = allVars.filter(function(v) { return v.variableCollectionId === semColl.id; });

    // semVarId → { lightPrimName?, darkPrimName? }
    var semSavedAliases = {};
    semVars.forEach(function(sv) {
      var entry = {};
      var lv = sv.valuesByMode[lightMode.modeId];
      if (lv && lv.type === 'VARIABLE_ALIAS' && oldPrimById[lv.id]) {
        entry.lightPrimName = oldPrimById[lv.id].name;
      }
      if (darkMode) {
        var dv = sv.valuesByMode[darkMode.modeId];
        if (dv && dv.type === 'VARIABLE_ALIAS' && oldPrimById[dv.id]) {
          entry.darkPrimName = oldPrimById[dv.id].name;
        }
      }
      if (entry.lightPrimName || entry.darkPrimName) {
        semSavedAliases[sv.id] = entry;
      }
    });

    // Step 2: delete only Primitives
    primColl.remove();

    // Step 3: re-create Primitives from current Paint Styles
    var styles = await figma.getLocalPaintStylesAsync();
    var theme = detectTheme(styles);
    var primResult = createPrimitives(styles);

    figma.ui.postMessage({ type: 'phase', phase: 1, done: true });
    figma.ui.postMessage({ type: 'phase', phase: 2, done: false });
    figma.ui.postMessage({ type: 'status', message: 'Re-linking Semantic aliases...' });

    // Step 4: index new Primitive vars by name
    var newAllVars = await figma.variables.getLocalVariablesAsync('COLOR');
    var newPrimColl = (await figma.variables.getLocalVariableCollectionsAsync()).find(function(c) { return c.name === 'Primitives'; });
    var newPrimsByName = {};
    if (newPrimColl) {
      newAllVars.filter(function(v) { return v.variableCollectionId === newPrimColl.id; })
        .forEach(function(v) { newPrimsByName[v.name] = v; });
    }

    // Step 5: re-point Semantic aliases to new Primitive var IDs
    semVars.forEach(function(sv) {
      var saved = semSavedAliases[sv.id];
      if (!saved) return;
      if (saved.lightPrimName && newPrimsByName[saved.lightPrimName]) {
        sv.setValueForMode(lightMode.modeId, figma.variables.createVariableAlias(newPrimsByName[saved.lightPrimName]));
      }
      if (darkMode && saved.darkPrimName && newPrimsByName[saved.darkPrimName]) {
        sv.setValueForMode(darkMode.modeId, figma.variables.createVariableAlias(newPrimsByName[saved.darkPrimName]));
      }
    });

    figma.ui.postMessage({ type: 'phase', phase: 2, done: true });
    figma.ui.postMessage({ type: 'phase', phase: 3, done: true }); // Component unchanged

    // Step 6: build phaseAState so Phase B (rebind) works if user wants it
    var rebuildMaps = await buildContextMapsFromCollections();
    var allNodes = await loadAllNodes();
    var finalColls = await figma.variables.getLocalVariableCollectionsAsync();
    var fPrimColl = finalColls.find(function(c) { return c.name === 'Primitives'; });
    var fSemColl  = finalColls.find(function(c) { return c.name === 'Semantic'; });
    var fCompColl = finalColls.find(function(c) { return c.name === 'Component'; });

    phaseAState = {
      allLogs: primResult.logLines,
      allNodes: allNodes,
      semByFillContextKey:   rebuildMaps.semByFillContextKey,
      semByStrokeContextKey: rebuildMaps.semByStrokeContextKey,
      primitives: fPrimColl ? fPrimColl.variableIds.length : 0,
      semantic:   fSemColl  ? fSemColl.variableIds.length  : 0,
      components: fCompColl ? fCompColl.variableIds.length : 0
    };

    figma.root.setPluginData('styletotoken-v1', 'true');

    var componentNodes = figma.root.findAllWithCriteria({ types: ['COMPONENT'] });
    figma.ui.postMessage({
      type: 'phase_a_complete',
      primitives: phaseAState.primitives,
      semantic:   phaseAState.semantic,
      components: phaseAState.components,
      componentCount: componentNodes.length
    });

  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: e.message });
    console.error(e);
  }
}

figma.ui.onmessage = function(msg) {
  if (msg.type === 'run_phase_a') {
    pendingOverrideTheme = msg.sourceTheme || null;
    runPlugin(pendingOverrideTheme).catch(function(e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    });
  } else if (msg.type === 'run_phase_b') {
    executePhaseB(msg.scope).catch(function(e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    });
  } else if (msg.type === 'proceed') {
    pendingRun = false;
    figma.getLocalPaintStylesAsync().then(function(styles) {
      return executePhaseA(styles, pendingOverrideTheme);
    }).catch(function(e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    });
  } else if (msg.type === 'scan') {
    executeScan().catch(function(e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    });
  } else if (msg.type === 'run_rebind_only') {
    executeRebindOnly(msg.scope).catch(function(e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    });
  } else if (msg.type === 'run_update_migration') {
    executeUpdateMigration().catch(function(e) {
      figma.ui.postMessage({ type: 'error', message: e.message });
    });
  } else if (msg.type === 'cancel') {
    pendingRun = false;
    phaseAState = null;
    figma.ui.postMessage({ type: 'status', message: 'Cancelled.' });
  } else if (msg.type === 'close') {
    figma.closePlugin();
  } else if (msg.type === 'resize') {
    figma.ui.resize(msg.width, msg.height);
  }
};
