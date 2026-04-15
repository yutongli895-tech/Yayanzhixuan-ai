export const onRequestPost: PagesFunction = async (context) => {
  const { request } = context;
  const body = await request.json();
  
  console.log("User Feedback Received:", body);
  
  // 在实际生产中，这里可以将反馈存入 D1 或发送邮件
  // 目前仅返回成功
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
};
