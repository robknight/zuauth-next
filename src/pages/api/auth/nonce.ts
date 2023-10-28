import { NextApiRequest, NextApiResponse } from "next";
import { withIronSessionApiRoute } from "iron-session/next";
import { getRandomValues, hexToBigInt, toHexString } from "@pcd/util";

export default withIronSessionApiRoute(
  async function nonceRoute(req: NextApiRequest, res: NextApiResponse) {
    try {
      req.session.nonce = hexToBigInt(
        toHexString(getRandomValues(30))
      ).toString();

      await req.session.save();

      res.status(200).send(req.session.nonce);
    } catch (error) {
      console.error(`[ERROR] ${error}`);
      res.send(500);
    }
  },
  {
    cookieName: process.env.SESSION_COOKIE_NAME as string,
    password: process.env.SESSION_PASSWORD as string,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
    }
  });