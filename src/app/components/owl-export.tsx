import owlImg from "figma:asset/4a55ada70b76fbbca1bf79d3254436c5147f757c.png";

export function OwlExport() {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = owlImg;
    a.download = "sovunya-owl.png";
    a.click();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50">
      <img src={owlImg} alt="Совунья" className="w-48 h-48 object-contain" />
      <button
        onClick={handleDownload}
        className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
      >
        ⬇ Скачать совушку
      </button>
      <p className="text-sm text-slate-400">Или правой кнопкой мыши → «Сохранить изображение»</p>
    </div>
  );
}
