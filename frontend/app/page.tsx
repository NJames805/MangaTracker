import Search from "./components/search";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-5xl font-extrabold tracking-tight text-black dark:text-white sm:text-[5rem]">
          Manga Tracker
        </h1>
        <p className="mt-3 text-2xl text-zinc-700 dark:text-zinc-400 sm:mt-5 sm:text-3xl">
          Keep track of your favorite manga and discover new ones.
        </p>
        <div className="mt-10 w-full">
          <Search />
        </div>
      </main>
    </div>
  );
}