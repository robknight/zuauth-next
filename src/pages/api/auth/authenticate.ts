import { supportedEvents } from "@/zupass-config";
import { isEqualEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { withIronSessionApiRoute } from "iron-session/next";
import { NextApiRequest, NextApiResponse } from "next";

const nullifiers = new Set<string>();

// https://api.zupass.org/issue/eddsa-public-key
const zupassPublicKey: [string, string] = [
  "05e0c4e8517758da3a26c80310ff2fe65b9f85d89dfc9c80e6d0b6477f88173e",
  "29ae64b615383a0ebb1bc37b3a642d82d37545f0f5b1444330300e4c4eedba3f"
];

export default withIronSessionApiRoute(
  async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
      if (!req.body.pcd) {
        console.error(`[ERROR] No PCD specified`);

        res.status(400).send("No PCD specified");
        return;
      }

      const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(req.body.pcd);

      if (!(await ZKEdDSAEventTicketPCDPackage.verify(pcd))) {
        console.error(`[ERROR] ZK ticket PCD is not valid`);

        res.status(401).send("ZK ticket PCD is not valid");
        return;
      }

      if (!isEqualEdDSAPublicKey(zupassPublicKey, pcd.claim.signer)) {
        console.error(`[ERROR] PCD is not signed by Zupass`);

        res.status(401).send("PCD is not signed by Zupass");
        return;
      }

      if (pcd.claim.watermark.toString() !== req.session.nonce) {
        console.error(`[ERROR] PCD watermark doesn't match`);

        res.status(401).send("PCD watermark doesn't match");
        return;
      }

      if (!pcd.claim.nullifierHash) {
        console.error(`[ERROR] PCD ticket nullifier has not been defined`);

        res.status(401).send("PCD ticket nullifer has not been defined");
        return;
      }

      if (nullifiers.has(pcd.claim.nullifierHash)) {
        console.error(`[ERROR] PCD ticket has already been used`);

        res.status(401).send("PCD ticket has already been used");
        return;
      }

      if (pcd.claim.partialTicket.eventId) {
        const eventId = pcd.claim.partialTicket.eventId;
        if (!supportedEvents.includes(eventId)) {
          console.error(
            `[ERROR] PCD ticket has an unsupported event ID: ${eventId}`
          );
          res.status(400).send("PCD ticket is not for a supported event");
          return;
        }
      } else {
        for (const eventId of pcd.claim.validEventIds ?? []) {
          if (!supportedEvents.includes(eventId)) {
            console.error(
              `[ERROR] PCD ticket might have an unsupported event ID: ${eventId}`
            );
            res
              .status(400)
              .send("PCD ticket is not restricted to supported events");
            return;
          }
        }
      }

      // The PCD's nullifier is saved so that it prevents the
      // same PCD from being reused for another login.
      nullifiers.add(pcd.claim.nullifierHash);

      req.session.user = pcd.claim.partialTicket.attendeeEmail as string;

      await req.session.save();

      res.status(200).send({
        attendeeEmail: pcd.claim.partialTicket.attendeeEmail
      });
    } catch (error: any) {
      console.error(`[ERROR] ${error.message}`);

      res.status(500).send(`Unknown error: ${error.message}`);
    }
  },
  {
    cookieName: process.env.SESSION_COOKIE_NAME as string,
    password: process.env.SESSION_PASSWORD as string,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production"
    }
  }
);
