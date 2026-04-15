interface Env {
  ADMIN_PASSWORD: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const { password } = await request.json() as { password?: string };

  if (password === env.ADMIN_PASSWORD) {
    // In a real app, you'd set a secure cookie or JWT here.
    // For this demo, we'll return a simple success status.
    return new Response(JSON.stringify({ success: true, token: "mock-admin-token" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: false, error: "Invalid password" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
};
