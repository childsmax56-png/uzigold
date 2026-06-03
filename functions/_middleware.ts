// Pass-through middleware — OG tag injection handled by the deployed worker
export const onRequest: PagesFunction = async (context) => {
  return context.next();
};
