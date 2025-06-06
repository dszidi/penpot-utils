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

penpot.ui.open("TrueNAS Utils", `?theme=${penpot.theme}`);

penpot.ui.onMessage<Notification>((notification: Notification) => {
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
      const currentPage: Page | null = penpot.currentPage;
      let drivetrays: Shape[] | undefined = currentPage?.findShapes({
        nameLike: 'handle-', // Components seem to be registered as boards??
      }).filter((handle) => { // Filter by enclosure instance name
        const instanceName = handle.componentHead()?.parent?.parent?.parent?.name;        
        return instanceName == enclosureConfig.selectedEnclosure;
      });

      if (enclosureConfig.slotList.length) {
        drivetrays = drivetrays.filter((handle) => { // filter by slot list
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
