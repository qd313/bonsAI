import React from "react";

type StubProps = Record<string, unknown> & { children?: React.ReactNode };

function stub(name: string) {
  return function DeckyUiStub({ children, ...rest }: StubProps) {
    return (
      <div data-decky-ui={name} {...rest}>
        {children}
      </div>
    );
  };
}

export const PanelSection = stub("PanelSection");
export const PanelSectionRow = stub("PanelSectionRow");
export const TextField = stub("TextField");
export const ToggleField = stub("ToggleField");
export const Button = stub("Button");
export const Focusable = stub("Focusable");
export const Navigation = stub("Navigation");
export const Tabs = stub("Tabs");
export const SliderField = stub("SliderField");
export const Dropdown = stub("Dropdown");
export const DropdownOption = stub("DropdownOption");
export const ModalRoot = stub("ModalRoot");
export const ProgressBar = stub("ProgressBar");
export const Spinner = stub("Spinner");
export const Marquee = stub("Marquee");

export const Router = {
  MainRunningApp: { appid: 570, display_name: "Dota 2" },
};

export const showModal = (content: React.ReactNode) => content;
export const ConfirmModal = stub("ConfirmModal");
