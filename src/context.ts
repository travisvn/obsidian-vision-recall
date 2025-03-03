import { App } from "obsidian";
import * as React from "react";
import VisionRecallPlugin from "@/main"; // Import your plugin class

// Event target context
export const EventTargetContext = React.createContext<EventTarget | undefined>(undefined);

// New Context for Obsidian App
export const ObsidianAppContext = React.createContext<App | undefined>(undefined);

export const useObsidianApp = () => {
  const context = React.useContext(ObsidianAppContext);
  if (!context) {
    throw new Error("useObsidianApp must be used within an ObsidianAppContextProvider");
  }
  return context;
};

// Plugin context
export const PluginContext = React.createContext<VisionRecallPlugin | undefined>(undefined);

// Custom hook to use the plugin context
export const usePlugin = <T extends VisionRecallPlugin>(): T => {
  const context = React.useContext(PluginContext);
  if (!context) {
    throw new Error("usePlugin must be used within a PluginContextProvider");
  }
  return context as T;
};