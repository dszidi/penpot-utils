import { Page, Shape } from 'plugin-types';

export interface Notification {
  message: string;
  data: unknown | null;
}

export interface EnclosureConfig {
  selectedEnclosure: string | null; // Shape | null;
  slotList: string[];
}

let enclosureConfig: EnclosureConfig = {
  selectedEnclosure: null,
  slotList: [],
}

penpot.ui.open("TrueNAS Enclosure Utils", `?theme=${penpot.theme}`);

penpot.ui.onMessage<Notification>((notification: Notification) => {
  const currentPage: Page | null = penpot.currentPage;

  switch (notification.message) {
    case 'current-selection':
      break;
    case 'list-enclosure-options':
      const enclosures: Shape[] = listEnclosures();
      penpot.ui.sendMessage({
        message: "enclosure-options",
        data: enclosures.map((e: Shape) => e.name),
      });
      break;
    case 'select-enclosure':      
      enclosureConfig.selectedEnclosure = notification.data as string;
      break;
    case 'set-range':
      enclosureConfig.slotList = notification.data && notification.data.length ? notification.data as string[] : [];
      break;
    case 'select-all-drivetray-handles':    
      let drivetrays: Shape[] | undefined = currentPage?.findShapes({
        nameLike: 'handle-', // Components seem to be registered as boards??
      }).filter((handle) => { // Filter by enclosure instance name
        const instanceName = handle.componentHead()?.parent?.parent?.parent?.name;
        return instanceName == enclosureConfig.selectedEnclosure;
      });

      if (enclosureConfig.slotList.length) {
        drivetrays = drivetrays?.filter((handle) => { // filter by slot list
        const traySlot = handle.componentHead()?.name.split(' ')[1]; // component name is 'drivetray-slot <slot number>'
        const configSlot = enclosureConfig.slotList.filter((slot) => Number(traySlot) == Number(slot));      
        return Number(traySlot) == Number(configSlot);
        });
      }

      if (drivetrays) {
        penpot.selection = drivetrays;
      }
      break;

    case 'selection-changed':
      console.log('selection changed');
      break;

    case 'export-as-svg':
      const selection = currentPage?.findShapes({
        name: enclosureConfig.selectedEnclosure,
      })[0];

      if (selection.isComponentInstance() && selection.type === 'board' && selection.isComponentRoot()) {
        const svgData = componentToSVG (selection);
        // console.log(svgData);

        // In order to get it into the clipboard we must send to parent frame
        penpot.ui.sendMessage({
          message: 'copy-to-clipboard',
          data: svgData,
        });
      } else {
        console.warn('This is not a component');
      }
      break;

    default:
      console.warn('Unknown message type:', notification.message);
  }
});

// Update the theme in the iframe
penpot.on("themechange", (theme) => {
  penpot.ui.sendMessage({
    source: "penpot",
    type: "themechange",
    theme,
  });
});


function listEnclosures(): Shape[] {
  const currentPage: Page | null = penpot.currentPage;

  const enclosures: Shape[] = currentPage.findShapes({
    type: 'board', // Components seem to be registered as boards??
  }).filter((enclosure) => {
    const isInstance = (enclosure.isComponentInstance() || enclosure.component());
    const isEnclosureComponent = enclosure.component()?.name.includes('enclosure')
    const isNotSubComponent = !enclosure.name.includes('drivetray') && !enclosure.name.includes('chassis');

    return ( isInstance && isEnclosureComponent && isNotSubComponent);
  });

  return enclosures;
}

/*penpot.ui.onMessage<string>((message) => {
  switch (message) {
    case 'export-as-svg':
      //console.log(message);
      //console.log(penpot.selection[0].name);
      const selection = penpot.selection[0];

      if (selection.isComponentInstance() && selection.type === 'board' && selection.isComponentRoot()) {
        const svgData = componentToSVG (penpot.selection[0]);
        console.log('INSTANCE: ' + selection.componentHead()?.name);
        console.log('COMPONENT: ' + penpot.selection[0].component()?.name);
        console.log(navigator);
        console.log(svgData);
      } else {
        console.warn('This is not a component');
      }
      break;
  default:
    console.warn('Unknown message: ' + message);
  }
});*/

function componentToSVG(componentInstance) {
  const colors = new Set();
  const svgElements = [];
  
  // Helper function to extract color from various sources
  function extractColor(colorData) {
    if (!colorData) return null;
    
    if (typeof colorData === 'string') {
      return colorData;
    }
    
    if (colorData.color) {
      return colorData.color;
    }
    
    if (colorData.r !== undefined && colorData.g !== undefined && colorData.b !== undefined) {
      const alpha = colorData.a !== undefined ? colorData.a : 1;
      if (alpha < 1) {
        return `rgba(${Math.round(colorData.r)}, ${Math.round(colorData.g)}, ${Math.round(colorData.b)}, ${alpha})`;
      }
      return `rgb(${Math.round(colorData.r)}, ${Math.round(colorData.g)}, ${Math.round(colorData.b)})`;
    }
    
    return null;
  }
  
  // Helper function to collect colors from fills and strokes
  function collectColors(shape) {
    // Collect fill colors
    if (shape.fills) {
      shape.fills.forEach(fill => {
        if (fill.fillColor) {
          const color = extractColor(fill.fillColor);
          if (color) colors.add(color);
        }
        if (fill.fillOpacity !== undefined && fill.fillOpacity < 1) {
          // Handle opacity variations
        }
      });
    }
    
    // Collect stroke colors
    if (shape.strokes) {
      shape.strokes.forEach(stroke => {
        if (stroke.strokeColor) {
          const color = extractColor(stroke.strokeColor);
          if (color) colors.add(color);
        }
      });
    }
    
    // Single fill/stroke properties (fallback)
    if (shape.fill) {
      const color = extractColor(shape.fill);
      if (color) colors.add(color);
    }
    
    if (shape.stroke) {
      const color = extractColor(shape.stroke);
      if (color) colors.add(color);
    }
  }
  
  // Helper function to get fill and stroke attributes
  function getStyleAttributes(shape) {
    const attrs = {};
    
    // Handle fills
    if (shape.fills && shape.fills.length > 0) {
      const fill = shape.fills[0]; // Use first fill
      if (fill.fillColor) {
        attrs.fill = extractColor(fill.fillColor);
      }
      if (fill.fillOpacity !== undefined) {
        attrs['fill-opacity'] = fill.fillOpacity;
      }
    } else if (shape.fill) {
      attrs.fill = extractColor(shape.fill);
    } else {
      attrs.fill = 'none';
    }
    
    // Handle strokes
    if (shape.strokes && shape.strokes.length > 0) {
      const stroke = shape.strokes[0]; // Use first stroke
      if (stroke.strokeColor) {
        attrs.stroke = extractColor(stroke.strokeColor);
      }
      if (stroke.strokeWidth !== undefined) {
        attrs['stroke-width'] = stroke.strokeWidth;
      }
      if (stroke.strokeOpacity !== undefined) {
        attrs['stroke-opacity'] = stroke.strokeOpacity;
      }
    } else if (shape.stroke) {
      attrs.stroke = extractColor(shape.stroke);
      if (shape.strokeWidth !== undefined) {
        attrs['stroke-width'] = shape.strokeWidth;
      }
    }
    
    return attrs;
  }
  
  // Helper function to convert attributes object to string
  function attrsToString(attrs) {
    return Object.entries(attrs)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
  }
  
  // Helper function to process individual shapes
  function processShape(shape, parentTransform = '') {
    if (!shape.visible && shape.visible !== undefined) {
      return '';
    }
    
    collectColors(shape);
    
    const commonAttrs = getStyleAttributes(shape);
    
    // Add class for handle layers
    if (shape.name && shape.name.startsWith('handle-')) {
      commonAttrs.class = 'tint-target';
    }
    
    // Handle transforms
    let transform = parentTransform;
    if (shape.transform) {
      const matrix = shape.transform;
      transform += ` matrix(${matrix.a || 1}, ${matrix.b || 0}, ${matrix.c || 0}, ${matrix.d || 1}, ${matrix.e || 0}, ${matrix.f || 0})`;
    }
    
    if (transform.trim()) {
      commonAttrs.transform = transform.trim();
    }
    
    switch (shape.type) {
      case 'rect':
        return `<rect x="${shape.x || 0}" y="${shape.y || 0}" width="${shape.width || 0}" height="${shape.height || 0}" ${attrsToString(commonAttrs)}/>`;
      
      case 'circle':
        const radius = (shape.width || shape.height || 0) / 2;
        const cx = (shape.x || 0) + radius;
        const cy = (shape.y || 0) + radius;
        return `<circle cx="${cx}" cy="${cy}" r="${radius}" ${attrsToString(commonAttrs)}/>`;
      
      case 'ellipse':
        const rx = (shape.width || 0) / 2;
        const ry = (shape.height || 0) / 2;
        const centerX = (shape.x || 0) + rx;
        const centerY = (shape.y || 0) + ry;
        return `<ellipse cx="${centerX}" cy="${centerY}" rx="${rx}" ry="${ry}" ${attrsToString(commonAttrs)}/>`;
      
      case 'path':
        if (shape.content) {
          return `<path d="${shape.content}" ${attrsToString(commonAttrs)}/>`;
        }
        return '';
      
      case 'text':
        const textAttrs = { ...commonAttrs };
        if (shape.fontSize) textAttrs['font-size'] = shape.fontSize;
        if (shape.fontFamily) textAttrs['font-family'] = shape.fontFamily;
        if (shape.fontWeight) textAttrs['font-weight'] = shape.fontWeight;
        
        return `<text x="${shape.x || 0}" y="${(shape.y || 0) + (shape.fontSize || 16)}" ${attrsToString(textAttrs)}>${shape.text || ''}</text>`;
      
      case 'group':
      case 'frame':
        const groupAttrs = {};
        if (transform.trim()) {
          groupAttrs.transform = transform.trim();
        }
        if (shape.name && shape.name.startsWith('handle-')) {
          groupAttrs.class = 'tint-target';
        }
        
        const children = shape.children || shape.objects || [];
        const childElements = children.map(child => processLayer(child, transform)).join('');
        
        return `<g ${attrsToString(groupAttrs)}>${childElements}</g>`;
      
      default:
        return '';
    }
  }
  
  // Main recursive function to process layers
  function processLayer(layer, parentTransform = '') {
    if (!layer) return '';
    
    // Handle component instances
    if (layer.type === 'instance' && layer.component) {
      return processLayer(layer.component, parentTransform);
    }
    
    // Handle groups and frames with children
    if (layer.children || layer.objects) {
      const children = layer.children || layer.objects;
      return children.map(child => processLayer(child, parentTransform)).join('');
    }
    
    // Handle individual shapes
    return processShape(layer, parentTransform);
  }
  
  // Process the component instance
  const content = processLayer(componentInstance);
  
  // Calculate bounding box (simplified approach)
  const bbox = {
    x: componentInstance.x || 0,
    y: componentInstance.y || 0,
    width: componentInstance.width || 100,
    height: componentInstance.height || 100
  };
  
  // Generate CSS color classes
  const colorArray = Array.from(colors);
  const cssRules = colorArray.map((color, index) => {
    const className = `color-${index}`;
    return `.${className} { fill: ${color}; }`;
  }).join('\n    ');
  
  // Generate final SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}" width="${bbox.width}" height="${bbox.height}">
  <style>
    ${cssRules}
    .tint-target { /* Special class for handle layers */ }
  </style>
  ${content}
</svg>`;
  
  return svg;
}

