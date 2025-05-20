import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Calendar,
  Info,
} from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPIC, setSelectedPIC] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [viewDetails, setViewDetails] = useState(null);

  // Parsing CSV dengan delimiter ;
  function parseCsv(text) {
    const rows = text.split("\n").filter((line) => line.trim() !== "");
    const headers = rows[0].split(";").map((h) => h.trim());

    const parsedData = [];
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split(";");
      if (values.length < 2) continue;

      const rowData = {};
      for (let j = 0; j < headers.length; j++) {
        rowData[headers[j]] = values[j] ? values[j].trim() : "";
      }

      if (rowData["No."] && !isNaN(parseInt(rowData["No."]))) {
        const notes = rowData["Keterangan"] || "";
        let milestone = "";

        if (notes.includes("UAT")) {
          const uatMatch = notes.match(/UAT tgl (\d+ \w+ \d+)/);
          milestone = uatMatch ? `UAT: ${uatMatch[1]}` : "UAT Scheduled";
        } else if (notes.includes("VT")) {
          milestone = "Verification Testing";
        }

        parsedData.push({
          No: parseInt(rowData["No."]),
          Title: rowData["Usulan dan Rencana UR 2025"] || "Unknown",
          SendDate: rowData["Tanggal Kirim"] || "",
          SendStatus: rowData["Status Kirim"] === "TRUE",
          PIC_AP: rowData["PIC AP"] || "",
          PIC_TSI: rowData["PIC TSI"] || "",
          ProgressTSI:
            parseFloat(String(rowData["Progress TSI"] || "0").replace("%", "")) ||
            0,
          StatusDevelopment: rowData["Status Pengembangan"] === "TRUE",
          Notes: rowData["Keterangan"] || "",
          Milestone: milestone,
          DevelopmentPhase: getDevelopmentPhase(
            parseFloat(String(rowData["Progress TSI"] || "0").replace("%", "")),
            rowData["Keterangan"] || ""
          ),
        });
      }
    }

    return parsedData;
  }

  // Load default CSV dari folder public saat mount
  useEffect(() => {
    const loadDefaultData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/Monev SIP.csv");
        if (!response.ok) throw new Error("File CSV tidak ditemukan");
        const text = await response.text();
        const parsed = parseCsv(text);
        setData(parsed);
        setLoading(false);
      } catch (err) {
        setError("Gagal load file: " + err.message);
        setLoading(false);
      }
    };
    loadDefaultData();
  }, []);

  // Upload CSV handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setData([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = parseCsv(text);
        setData(parsed);
        setLoading(false);
      } catch {
        setError("Gagal memparsing file CSV");
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError("Gagal membaca file");
      setLoading(false);
    };
    reader.readAsText(file);
  };

  function getDevelopmentPhase(progress, notes) {
    if (progress === 0) return "Not Started";
    if (progress === 100) {
      if (notes.includes("VT")) return "Verification Testing";
      if (notes.includes("UAT")) return "User Acceptance Testing";
      return "Development Complete";
    }
    if (progress >= 90) return "Final Testing";
    if (progress >= 75) return "Integration";
    if (progress >= 50) return "Development";
    if (progress >= 25) return "Design";
    return "Initial Development";
  }

  const getFilteredData = () =>
    data.filter(
      (item) =>
        (selectedPIC === "All" || item.PIC_TSI === selectedPIC) &&
        (selectedStatus === "All" ||
          (selectedStatus === "Complete" && item.ProgressTSI === 100) ||
          (selectedStatus === "In Progress" &&
            item.ProgressTSI > 0 &&
            item.ProgressTSI < 100) ||
          (selectedStatus === "Not Started" && item.ProgressTSI === 0))
    );

  const filteredData = getFilteredData();

  const getTotalTasks = () => filteredData.length;
  const getCompletedTasks = () =>
    filteredData.filter((item) => item.ProgressTSI === 100).length;
  const getOverallProgress = () => {
    if (filteredData.length === 0) return 0;
    const sum = filteredData.reduce((acc, item) => acc + (item.ProgressTSI || 0), 0);
    return Math.round(sum / filteredData.length);
  };
  const getUATCount = () =>
    filteredData.filter((item) => item.Notes.includes("UAT")).length;

  const getDevStatusStats = () => {
    const completed = getCompletedTasks();
    const inProgress = filteredData.filter(
      (item) => item.ProgressTSI > 0 && item.ProgressTSI < 100
    ).length;
    const notStarted = filteredData.filter((item) => item.ProgressTSI === 0).length;

    return [
      { name: "Completed", value: completed, color: "#10B981" },
      { name: "In Progress", value: inProgress, color: "#F59E0B" },
      { name: "Not Started", value: notStarted, color: "#EF4444" },
    ];
  };

  const getProgressByPIC = () => {
    const picMap = {};
    filteredData.forEach((item) => {
      const pic = item.PIC_TSI || "Unassigned";
      if (!picMap[pic]) {
        picMap[pic] = {
          name: pic,
          totalTasks: 0,
          completedTasks: 0,
          progressSum: 0,
        };
      }
      picMap[pic].totalTasks++;
      picMap[pic].progressSum += item.ProgressTSI || 0;
      if (item.ProgressTSI === 100) picMap[pic].completedTasks++;
    });
    return Object.values(picMap).map((item) => ({
      ...item,
      avgProgress: item.totalTasks
        ? Math.round(item.progressSum / item.totalTasks)
        : 0,
    }));
  };

  const picTSIs = ["All", ...new Set(data.map((item) => item.PIC_TSI))];

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-center text-blue-600">
          <Clock className="animate-spin mx-auto mb-4" size={40} />
          <p className="text-xl font-semibold">Loading data...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-center text-red-600">
          <AlertCircle size={40} className="mx-auto mb-4" />
          <p className="text-xl font-semibold">{error}</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-7xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-wide">
          Dashboard Pengembangan Aplikasi SIP DJKN
        </h1>
        <p className="text-gray-600 mt-1">
          Seksi Analisis Penilaian - Subdirektorat PMKAP - Direktorat Penilaian • {data.length} records
          loaded
        </p>
      </header>

      {/* Upload File CSV */}
      <section className="mb-8">
        <label
          htmlFor="csv-upload"
          className="block mb-2 font-medium text-gray-700 cursor-pointer"
        >
          Upload File CSV
        </label>
        <input
          type="file"
          id="csv-upload"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full max-w-xs rounded border border-gray-300 p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </section>

      {/* Filters */}
      <section className="mb-8 bg-white p-4 rounded-lg shadow-md flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-2">
          <Filter className="text-gray-500" size={18} />
          <span className="text-gray-700 font-semibold">Filters</span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-pic" className="text-gray-600 font-medium">
            PIC TSI:
          </label>
          <select
            id="filter-pic"
            value={selectedPIC}
            onChange={(e) => setSelectedPIC(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {picTSIs.map((pic) => (
              <option key={pic} value={pic}>
                {pic}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-status" className="text-gray-600 font-medium">
            Status:
          </label>
          <select
            id="filter-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All</option>
            <option value="Complete">Complete</option>
            <option value="In Progress">In Progress</option>
            <option value="Not Started">Not Started</option>
          </select>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-blue-600 flex items-center justify-between">
          <div>
            <p className="text-gray-500 uppercase text-xs font-semibold tracking-wide">
              Total Tasks
            </p>
            <p className="text-3xl font-bold text-gray-900">{getTotalTasks()}</p>
          </div>
          <FileText size={36} className="text-blue-600" />
        </div>

        <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-green-600 flex items-center justify-between">
          <div>
            <p className="text-gray-500 uppercase text-xs font-semibold tracking-wide">
              Completed
            </p>
            <p className="text-3xl font-bold text-gray-900">{getCompletedTasks()}</p>
          </div>
          <CheckCircle size={36} className="text-green-600" />
        </div>

        <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-yellow-400 flex items-center justify-between">
          <div>
            <p className="text-gray-500 uppercase text-xs font-semibold tracking-wide">
              Overall Progress
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {getOverallProgress()}%
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center relative">
            <svg className="w-14 h-14" viewBox="0 0 36 36" fill="none">
              <circle
                className="text-gray-300"
                stroke="currentColor"
                strokeWidth="3"
                cx="18"
                cy="18"
                r="15.9155"
              />
              <circle
                stroke="#F59E0B"
                strokeWidth="3"
                strokeDasharray={`${getOverallProgress()}, 100`}
                strokeLinecap="round"
                cx="18"
                cy="18"
                r="15.9155"
                style={{ transition: "stroke-dasharray 0.3s ease" }}
              />
            </svg>
            <span className="absolute text-sm font-semibold text-gray-900">
              {getOverallProgress()}%
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-purple-600 flex items-center justify-between">
          <div>
            <p className="text-gray-500 uppercase text-xs font-semibold tracking-wide">
              UAT Scheduled
            </p>
            <p className="text-3xl font-bold text-gray-900">{getUATCount()}</p>
          </div>
          <Calendar size={36} className="text-purple-600" />
        </div>
      </section>

      {/* Charts Section */}
      <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Development Status Chart */}
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Development Status
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getDevStatusStats()}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {getDevStatusStats().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} Tasks`, "Count"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Progress by PIC Chart */}
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Progress by PIC
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getProgressByPIC()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "avgProgress") return [`${value}%`, "Avg Progress"];
                  if (name === "totalTasks") return [value, "Total Tasks"];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="totalTasks" fill="#94A3B8" name="Total Tasks" />
              <Bar dataKey="completedTasks" fill="#10B981" name="Completed" />
              <Bar dataKey="avgProgress" fill="#3B82F6" name="Avg Progress %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Tasks Table */}
      <section className="bg-white rounded-lg shadow-md p-5 mb-10 overflow-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          SIP Update Requests
        </h2>
        <table className="min-w-full table-auto border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 border border-gray-300 text-left text-xs font-semibold uppercase">
                No.
              </th>
              <th className="p-3 border border-gray-300 text-left text-xs font-semibold uppercase">
                Update Request
              </th>
              <th className="p-3 border border-gray-300 text-left text-xs font-semibold uppercase">
                PIC AP
              </th>
              <th className="p-3 border border-gray-300 text-left text-xs font-semibold uppercase">
                PIC TSI
              </th>
              <th className="p-3 border border-gray-300 text-left text-xs font-semibold uppercase">
                Progress
              </th>
              <th className="p-3 border border-gray-300 text-left text-xs font-semibold uppercase">
                Development Stage
              </th>
              <th className="p-3 border border-gray-300 text-center text-xs font-semibold uppercase">
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr
                key={item.No}
                className={`${
                  item.No === viewDetails ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <td className="p-3 border border-gray-300 text-sm">{item.No}</td>
                <td className="p-3 border border-gray-300 text-sm">{item.Title}</td>
                <td className="p-3 border border-gray-300 text-sm">{item.PIC_AP}</td>
                <td className="p-3 border border-gray-300 text-sm">{item.PIC_TSI}</td>
                <td className="p-3 border border-gray-300">
                  <div className="bg-gray-200 rounded-full h-2.5 relative overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full ${
                        item.ProgressTSI === 100
                          ? "bg-green-500"
                          : item.ProgressTSI >= 80
                          ? "bg-blue-500"
                          : item.ProgressTSI >= 50
                          ? "bg-yellow-400"
                          : item.ProgressTSI > 0
                          ? "bg-orange-400"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${item.ProgressTSI}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-1 block">
                    {item.ProgressTSI}%
                  </span>
                </td>
                <td className="p-3 border border-gray-300 text-sm">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.DevelopmentPhase === "Verification Testing"
                        ? "bg-blue-100 text-blue-800"
                        : item.DevelopmentPhase === "User Acceptance Testing"
                        ? "bg-purple-100 text-purple-800"
                        : item.DevelopmentPhase === "Development Complete"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {item.DevelopmentPhase}
                  </span>
                </td>
                <td className="p-3 border border-gray-300 text-center text-sm">
                  <button
                    onClick={() =>
                      setViewDetails(item.No === viewDetails ? null : item.No)
                    }
                    className="inline-flex items-center gap-1 px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                  >
                    <Info size={14} />
                    {item.No === viewDetails ? "Hide" : "View"}
                  </button>
                </td>
              </tr>
            ))}

            {/* Detail row expanded */}
            {filteredData.map(
              (item) =>
                item.No === viewDetails && (
                  <tr key={`detail-${item.No}`} className="bg-blue-50">
                    <td
                      colSpan={7}
                      className="p-4 border border-gray-300 text-sm text-gray-700"
                    >
                      <div className="your-container-class overflow-visible">
  <h4 className="font-semibold mb-2">Development Notes:</h4>
  <p className="whitespace-pre-line break-words overflow-visible">{item.Notes || "-"}</p>
  <div className="mt-4 grid grid-cols-3 gap-6 text-gray-600 text-xs">
    {/* content */}
  </div>
                        <div>
                          <strong>Send Date:</strong> {item.SendDate || "Not Specified"}
                        </div>
                        <div>
                          <strong>Send Status:</strong>{" "}
                          {item.SendStatus ? "Sent" : "Not Sent"}
                        </div>
                        <div>
                          <strong>Status:</strong>{" "}
                          {item.StatusDevelopment ? "Active" : "Inactive"}
                        </div>
                        {item.Milestone && (
                          <div className="mt-2 col-span-full text-blue-700 font-semibold">
                            Next Milestone: {item.Milestone}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
            )}
          </tbody>
        </table>
      </section>

      <footer className="text-center text-gray-500 text-sm mb-6">
        SIP Development Progress Dashboard • Last updated: May 20, 2025
      </footer>
    </div>
  );
}
