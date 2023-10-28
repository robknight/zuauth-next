import { NextApiRequest, NextApiResponse } from "next";
import { withIronSessionApiRoute } from "iron-session/next";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";

const nullifiers = new Set<string>();

export default withIronSessionApiRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
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
/*
    const isValidTicket = value.knownTicketTypes.some((ticketType: any) => {
      return (
        ticketType.eventId === pcd.claim.partialTicket.eventId &&
        ticketType.productId === pcd.claim.partialTicket.productId &&
        ticketType.publicKey[0] === pcd.claim.signer[0] &&
        ticketType.publicKey[1] === pcd.claim.signer[1]
      );
    });

    if (!isValidTicket) {
      console.error(`[ERROR] PCD ticket doesn't exist on Zupass`);

      res.status(401);
      return;
    }*/

    // The PCD's nullifier is saved so that it prevents the
    // same PCD from being reused for another login.
    nullifiers.add(pcd.claim.nullifierHash);

    // The user value is anonymous as the nullifier
    // is the hash of the user's Semaphore identity and the
    // external nullifier (i.e. nonce).
    req.session.user = pcd.claim.nullifierHash;

    await req.session.save();

    res.status(200).send({
      ticketId: pcd.claim.partialTicket.ticketId,
      attendeeSemaphoreId: pcd.claim.partialTicket.attendeeSemaphoreId
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
});