import * as React from "react";

export type QuickAction = {
  id: string;
  label: string;
  prompt: string;
  icon?: React.ReactNode;
};

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "part-num", label: "Search by Part Number", prompt: "I want to search for a part by its number: " },
  { id: "vin", label: "Search by VIN", prompt: "My VIN is: " },
  { id: "vin-img", label: "Upload VIN Image", prompt: "I'm uploading a photo of my VIN — please read it and decode my vehicle." },
  { id: "warn", label: "Identify Warning Light", prompt: "I'm uploading a photo of a dashboard warning light — what does it mean?" },
  { id: "part-img", label: "Identify Car Part", prompt: "I'm uploading a photo of a car part — please identify it and find matches." },
  { id: "stock", label: "Check Stock", prompt: "Is this part in stock: " },
  { id: "offers", label: "Special Offers", prompt: "What special offers are active right now?" },
  { id: "sales", label: "Contact Sales Team", prompt: "Please connect me with a salesperson." },
  { id: "compat", label: "Find Compatible Parts", prompt: "Find parts compatible with my vehicle: " },
  { id: "track", label: "Track Order", prompt: "Please track my order number: " },
];
