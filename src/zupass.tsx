import { EdDSATicketPCDPackage, ITicketData } from "@pcd/eddsa-ticket-pcd";
import {
  constructPassportPcdGetRequestUrl,
  openPassportPopup,
  usePassportPopupMessages
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { useEffect, useState } from "react";
import { supportedEvents } from "./zupass-config";

const ZUPASS_URL = "https://zupass.org";

/**
 * Opens a Zupass popup to make a proof of a ZK EdDSA event ticket PCD.
 */
export function openZKEdDSAEventTicketPopup(
  fieldsToReveal: EdDSATicketFieldsToReveal,
  watermark: bigint,
  validEventIds: string[],
  validProductIds: string[]
) {
  const args: ZKEdDSAEventTicketPCDArgs = {
    ticket: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: EdDSATicketPCDPackage.name,
      value: undefined,
      userProvided: true,
      validatorParams: {
        eventIds: validEventIds,
        productIds: validProductIds,
        notFoundMessage: "No eligible PCDs found"
      }
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: undefined,
      userProvided: true
    },
    validEventIds: {
      argumentType: ArgumentTypeName.StringArray,
      value: validEventIds.length != 0 ? validEventIds : undefined,
      userProvided: false
    },
    fieldsToReveal: {
      argumentType: ArgumentTypeName.ToggleList,
      value: fieldsToReveal,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.BigInt,
      value: watermark.toString(),
      userProvided: false
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: watermark.toString(),
      userProvided: false
    }
  };

  const popupUrl = window.location.origin + "/popup";

  const proofUrl = constructPassportPcdGetRequestUrl<
    typeof ZKEdDSAEventTicketPCDPackage
  >(ZUPASS_URL, popupUrl, ZKEdDSAEventTicketPCDPackage.name, args, {
    genericProveScreen: true,
    title: "ZKEdDSA Ticket Proof",
    description: "ZKEdDSA Ticket PCD Request"
  });

  openPassportPopup(popupUrl, proofUrl);
}

/**
 * Performs server-side validation (PCD + challenge) for an EdDSA ticket PCD by sending a POST
 * request to the `consumer-server`, and updates the current session's state variable.
 *
 * @param serialized The stringified serialized form of an EdDSATicketPCD.
 */
export async function authenticate(serialized: string): Promise<boolean> {
  const { pcd, type } = JSON.parse(serialized);

  const response = await fetch("/auth/authenticate", {
    method: "POST",
    mode: "cors",
    credentials: "include",
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ pcd, type })
  });

  return response.status === 200;
}

type PartialTicketData = Partial<ITicketData>;

async function login() {
  const nonce = await (
    await fetch("/api/auth/nonce", { credentials: "include" })
  ).text();
  openZKEdDSAEventTicketPopup(
    {
      revealAttendeeEmail: true,
      revealEventId: true,
      revealProductId: true
    },
    BigInt(nonce),
    supportedEvents,
    []
  );
}

export function useZupass(): {
  login: () => Promise<void>;
  ticketData: PartialTicketData | undefined;
} {
  const [pcdStr] = usePassportPopupMessages();
  const [ticketData, setTicketData] = useState<PartialTicketData | undefined>(
    undefined
  );

  useEffect(() => {
    (async () => {
      if (pcdStr) {
        const response = await fetch("/api/auth/authenticate", {
          method: "POST",
          mode: "cors",
          credentials: "include",
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
          },
          body: pcdStr
        });

        if (response.status === 200) {
          setTicketData(await response.json());
        }
      }
    })();
  }, [pcdStr]);

  return { login, ticketData };
}
