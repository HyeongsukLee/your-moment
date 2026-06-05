export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-gray-950">
      <div className="h-8 w-8 rounded-full border-2 border-gray-700 border-t-indigo-500 animate-spin" />
      <span className="text-sm text-gray-500 font-semibold tracking-wide">
        your moment
      </span>
    </div>
  );
}
