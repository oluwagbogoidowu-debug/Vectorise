
export default async (req: any, res: any) => {
  const params = new URLSearchParams();
  
  // Handle potential arrays in query params (Express parses duplicate keys as arrays)
  for (const [key, value] of Object.entries(req.query)) {
    if (Array.isArray(value)) {
      params.set(key, value[0]); // Take only the first occurrence
    } else {
      params.set(key, value as string);
    }
  }

  const query = params.toString();
  // Redirect to the hash route in the frontend
  res.writeHead(302, {
    Location: `/#/payment-success?${query}`
  });
  res.end();
};
