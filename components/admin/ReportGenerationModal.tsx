import React, { useState } from 'react';
import { X, FileText, Calendar, Filter, Download, FileSpreadsheet, Layers, CheckCircle } from 'lucide-react';

interface ReportGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    courses: any[];
}

export const ReportGenerationModal: React.FC<ReportGenerationModalProps> = ({ isOpen, onClose, courses }) => {
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [scope, setScope] = useState<'all' | 'single'>('all');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [reportType, setReportType] = useState<'summary' | 'detailed'>('detailed');
    const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen) return null;

    const handleGenerate = () => {
        setIsGenerating(true);
        // Simulate generation delay for effect
        setTimeout(() => {
            setIsGenerating(false);
            onClose();
            alert(`Report Generated: ${scope === 'all' ? 'All Courses' : 'Specific Course'} - ${format.toUpperCase()}`);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                            <FileText className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Generate Report</h2>
                            <p className="text-indigo-200 text-xs uppercase tracking-wider font-semibold">Advanced Export Wizard</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-8">

                    {/* i. Date Range */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Calendar size={16} className="text-indigo-600" /> Date Range Selection
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-gray-500 mb-1 block">Start Date</span>
                                <input
                                    type="date"
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                    value={dateRange.start}
                                    onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                                />
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 mb-1 block">End Date</span>
                                <input
                                    type="date"
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                    value={dateRange.end}
                                    onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ii. Course Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Filter size={16} className="text-indigo-600" /> Course Scope
                        </label>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <button
                                onClick={() => setScope('all')}
                                className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${scope === 'all' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                All Courses
                            </button>
                            <button
                                onClick={() => setScope('single')}
                                className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${scope === 'single' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                Specific Course
                            </button>
                        </div>
                        {scope === 'single' && (
                            <select
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedCourse}
                                onChange={e => setSelectedCourse(e.target.value)}
                            >
                                <option value="">-- Select a Course --</option>
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        {/* iv. Format Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 block">Export Format</label>
                            <div className="space-y-2">
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${format === 'excel' ? 'bg-green-50 border-green-500 ring-1 ring-green-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" name="format" value="excel" checked={format === 'excel'} onChange={() => setFormat('excel')} className="text-green-600 focus:ring-green-500" />
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet size={18} className="text-green-600" />
                                        <span className={`text-sm font-semibold ${format === 'excel' ? 'text-green-800' : 'text-gray-600'}`}>Excel (.xlsx)</span>
                                    </div>
                                </label>
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${format === 'pdf' ? 'bg-red-50 border-red-500 ring-1 ring-red-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" name="format" value="pdf" checked={format === 'pdf'} onChange={() => setFormat('pdf')} className="text-red-600 focus:ring-red-500" />
                                    <div className="flex items-center gap-2">
                                        <FileText size={18} className="text-red-600" />
                                        <span className={`text-sm font-semibold ${format === 'pdf' ? 'text-red-800' : 'text-gray-600'}`}>PDF Document</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* v. Detail Level */}
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 block">Detail Level</label>
                            <div className="space-y-2">
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reportType === 'detailed' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" name="type" value="detailed" checked={reportType === 'detailed'} onChange={() => setReportType('detailed')} className="text-indigo-600 focus:ring-indigo-500" />
                                    <div className="flex items-center gap-2">
                                        <Layers size={18} className="text-indigo-600" />
                                        <span className={`text-sm font-semibold ${reportType === 'detailed' ? 'text-indigo-800' : 'text-gray-600'}`}>Detailed Records</span>
                                    </div>
                                </label>
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reportType === 'summary' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input type="radio" name="type" value="summary" checked={reportType === 'summary'} onChange={() => setReportType('summary')} className="text-indigo-600 focus:ring-indigo-500" />
                                    <div className="flex items-center gap-2">
                                        <Layers size={18} className="text-indigo-600" />
                                        <span className={`text-sm font-semibold ${reportType === 'summary' ? 'text-indigo-800' : 'text-gray-600'}`}>Summary Only</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>
                                <Download size={20} />
                                Generate Report
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
