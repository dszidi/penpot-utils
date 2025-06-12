import "./style.css";
import { Notification } from './plugin.ts';

// get the current theme from the URL
const searchParams = new URLSearchParams(window.location.search);
document.body.dataset.theme = searchParams.get("theme") ?? "light";

document.querySelector("[data-handler='current-selection']")?.addEventListener("click", () => {
  // send message to plugin.ts
  parent.postMessage({ message: "current-selection" }, "*");
});

document.querySelector("[data-handler='list-enclosures']")?.addEventListener("click", () => {
  // send message to plugin.ts
  parent.postMessage({ message: "list-enclosure-options" }, "*");
});

// document.querySelector("[data-handler='select-all-drivetray-handles']")
const btnApply = document.getElementById('btn-apply-selection');
btnApply?.addEventListener("click", () => {
  // send message to plugin.ts
  parent.postMessage({ message: "select-all-drivetray-handles" }, "*");
  btnApply.blur();
});

// document.querySelector("[data-handler='export-as-svg']")
const btnCopy = document.getElementById('btn-apply-selection');
btnCopy?.addEventListener("click", () => {
  // send message to plugin.ts
  parent.postMessage({ message: "export-as-svg" }, "*");
  // btnCopy.blur();
});


// ENCLOSURE OPTIONS
const enclosureSelect = document.getElementById("enclosure-select") as HTMLSelectElement;

enclosureSelect.addEventListener("change", () => {
  const selected = enclosureSelect.value;
  if (selected) {
    const notification = {
      message: 'select-enclosure',
      data: selected,
    }

    parent.postMessage(notification, "*");
  }
});

function updateSelectOptions(names: string[]) {
  enclosureSelect.innerHTML = '<option value="">Enclosure Instance</option>';

  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    enclosureSelect.appendChild(option);
  });
}


// SLOT RANGE
const slotRange = document.getElementById("slot-range") as HTMLSelectElement;

slotRange.addEventListener("input", () => {
  let payload: string[] | null = null;
  const value = slotRange.value;
  const isRange = value.includes('-');
  const isList = value.includes(',');
  let isValid = false;

  if (isRange) {
    isValid = isValidRange(value);
  } else if (isList) {
    isValid = isValidList(value);
  }
    
  if (value && isValid) {
    // Send a list even if it is a range
    payload = isRange ? rangeToList(value) : value.split(',').filter(Boolean);  

  } else {
    if (value.length === 0) {
      // send empty array if input event is completely empty
      payload = [];
    } else {
      return;
    }
  }

    const notification = {
      message: 'set-range',
      data: payload,
    };

    parent.postMessage(notification, "*");
});

function rangeToList (range: string): string[] {
  let list: string[] = [];
  
  // Assume everything is already validated
  // Sort based on numeric value
  const sanitized = range.split('-').map((slot) => Number(slot)).sort((a, b) => a - b).map((slot) => slot.toString());

  for (let i = Number(sanitized[0]); i <= Number(sanitized[1]); i++) {
    list.push(i.toString());
  }

  return list;
}

function isValidRange (value: string): boolean {
  let output = false;
  let isRange = value.includes('-');

  if (!isRange || value.split('-').filter(Boolean).length !== 2) {
    return output;
  }
  
  const tally = 0;
  const reducedValue = value.split('-').reduce(
    (accumulator, currentValue) => accumulator + Number(currentValue),
    tally,
  );

  output = isRange && reducedValue > 2; // smallest slot combination is 1 and 2

  return output;
}

function isValidList (value: string): boolean {
  let output = false;
  let isList = value.includes(',');
  const split = value.split(',');

  const deduped = [...new Set(split)];

  if (!isList || deduped.length < value.split(',').length) {
    return output;
  }
  
  const tally = 0;
  const reducedValue = value.split(',').reduce(
    (accumulator, currentValue) => accumulator + Number(currentValue),
    tally,
  );

  output = isList && reducedValue > 2; // smallest slot combination is 1 and 2

  return output;
}


// PLUGIN EVENTS
const hiddenPreview = document.getElementById("hidden-preview") as HTMLSelectElement;
// const userPreview = document.getElementById("user-preview") as HTMLSelectElement;

window.addEventListener("message", (event) => {
  const notification: Notification = event.data;
  switch (notification.message) {
    case "enclosure-options": 
      updateSelectOptions(notification.data as string[]);
      break;
    case "copy-to-clipboard": 
      console.log(notification.data);
      console.log(navigator);
      // userPreview.innerText = notification.data as string;
      //hiddenPreview.innerText = notification.data as string;
      hiddenPreview.value = notification.data as string;
      // navigator.clipboard.writeText(notification.data as string);
      
      hiddenPreview.focus();
      hiddenPreview.select();
      
      try {
        const successful = document.execCommand("copy");
        console.log("Copy command was " + (successful ? "successful" : "unsuccessful"));
        return successful;
      } catch (err) {
        console.error("Error during copy attempt:", err);
        return false;
      } finally {
        // Optional: clear the field afterward
        hiddenPreview.innerText = "";
        hiddenPreview.value = "";
        hiddenPreview.blur();
        btnCopy.blur();
        console.log('FINISHING...');
      }
      break;
  default:
    console.warn(notification);
  }  
});

document.addEventListener("DOMContentLoaded", () => {
  init();
});

function init() {
  // Your startup logic here
  parent.postMessage({ message: "list-enclosure-options" }, "*");  
}

