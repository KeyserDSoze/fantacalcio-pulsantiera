import { PublicClientApplication } from "@azure/msal-browser";
import type { Configuration, AccountInfo } from "@azure/msal-browser";

const msalConfig: Configuration = {
  auth: {
  clientId: "95de3061-5eab-437d-a2cc-6d71cfaef4d1",
  redirectUri: window.location.origin,
  // Use common endpoint to allow both work/school and personal Microsoft accounts
  authority: 'https://login.microsoftonline.com/consumers',
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest = {
  scopes: ["User.Read"],
};

export type MsalAccount = AccountInfo;

export default msalInstance;
