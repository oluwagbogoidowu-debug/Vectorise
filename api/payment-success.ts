
export default async (req: any, res: any) => {
  const query = new URLSearchParams(req.query as any).toString();
  // Redirect to the hash route in the frontend
  res.writeHead(302, {
    Location: `/#/payment-success?${query}`
  });
  res.end();
};
