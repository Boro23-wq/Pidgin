export const pidginClerkAppearance = {
  variables: {
    colorPrimary: "hsl(199 89% 48%)",
    colorText: "hsl(0 0% 98%)",
    colorTextSecondary: "hsl(240 5% 62%)",
    colorBackground: "hsl(240 10% 3.9%)",
    colorInputBackground: "hsl(240 4% 13%)",
    colorInputText: "hsl(0 0% 98%)",
    colorDanger: "hsl(0 84% 60%)",
    borderRadius: "0.875rem",
  },
  elements: {
    rootBox: "!w-full !max-w-[440px]",
    cardBox: "!w-full !max-w-[440px] !mx-auto !bg-transparent !shadow-none",
    card: "!w-full !bg-transparent !border-0 !shadow-none !p-0 text-foreground",
    header: "!mb-8",
    headerTitle:
      "!text-white !text-[42px] !leading-[1.02] !font-bold !tracking-normal",
    headerSubtitle: "!mt-3 !text-[17px] !leading-7 !text-muted-foreground",
    socialButtonsBlockButton:
      "!h-14 !rounded-[14px] !border !border-border/80 !bg-secondary/30 !text-foreground !font-semibold hover:!bg-secondary/70 transition-colors",
    socialButtonsBlockButtonText: "!text-foreground !font-semibold",
    dividerLine: "!bg-border/70",
    dividerText: "!text-muted-foreground !text-xs !font-medium",
    formField: "!space-y-2",
    formFieldLabel:
      "!text-muted-foreground !text-xs !font-semibold !uppercase !tracking-[0.18em]",
    formFieldInput:
      "!h-14 !rounded-[10px] !border !border-border/80 !bg-secondary/45 !px-4 !text-foreground !shadow-none placeholder:!text-muted-foreground focus:!border-primary focus:!ring-2 focus:!ring-primary/20",
    formFieldInputShowPasswordButton:
      "!text-muted-foreground hover:!text-foreground",
    formFieldInputShowPasswordIcon: "!text-muted-foreground",
    formButtonPrimary:
      "!h-14 !rounded-[14px] !bg-gradient-to-r !from-sky-500 !to-blue-600 !text-white !text-base !font-semibold !shadow-[0_18px_40px_hsl(199_89%_48%/0.24)] hover:!brightness-110 active:!brightness-95",
    formFieldAction: "!text-primary hover:!text-sky-300",
    footer: "!mt-8",
    footerActionText: "!text-muted-foreground",
    footerActionLink: "!text-primary hover:!text-sky-300 !font-semibold",
    identityPreview:
      "!rounded-[12px] !border !border-border/80 !bg-secondary/35 !text-foreground",
    identityPreviewText: "!text-foreground",
    identityPreviewEditButton: "!text-primary hover:!text-sky-300",
    alert:
      "!rounded-[12px] !border !border-red-500/30 !bg-red-500/10 !text-red-200",
    alertText: "!text-red-200",
    formResendCodeLink: "!text-primary hover:!text-sky-300",
    otpCodeFieldInput:
      "!rounded-[10px] !border-border/80 !bg-secondary/45 !text-foreground",
  },
};
