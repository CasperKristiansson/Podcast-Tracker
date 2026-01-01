import {
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

interface PreTokenGenerationEvent {
  userPoolId?: string;
  userName?: string;
  request?: {
    userAttributes?: Record<string, string>;
  };
}

const APPROVAL_ATTRIBUTE = process.env.APPROVAL_ATTRIBUTE ?? "custom:approved";
const PENDING_ERROR = "USER_NOT_APPROVED";

const cognito = new CognitoIdentityProviderClient({});

const isApproved = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(normalized);
};

const ensureApprovalAttribute = async (
  userPoolId: string | undefined,
  username: string | undefined,
  currentValue: string | undefined
): Promise<string | undefined> => {
  if (currentValue !== undefined || !userPoolId || !username) {
    return currentValue;
  }

  await cognito.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: username,
      UserAttributes: [{ Name: APPROVAL_ATTRIBUTE, Value: "false" }],
    })
  );

  return "false";
};

export const handler = async (
  event: PreTokenGenerationEvent
): Promise<PreTokenGenerationEvent> => {
  const attributes = event.request?.userAttributes ?? {};
  const rawValue = await ensureApprovalAttribute(
    event.userPoolId,
    event.userName,
    attributes[APPROVAL_ATTRIBUTE]
  );

  if (!isApproved(rawValue)) {
    throw new Error(PENDING_ERROR);
  }

  return event;
};
