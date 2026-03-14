import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Download, Plus, Trash2 } from 'lucide-react';

export default function TakeoffEstimator() {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('amvic');
  const [wallHeight, setWallHeight] = useState('10');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [walls, setWalls] = useState([]);
  const [estimate, setEstimate] = useState(null);
  const [complexity, setComplexity] = useState('standard');
  const fileInputRef = useRef(null);

  const baseRate = {
    'simple': 150,
    'standard': 175,
    'complex': 200
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  };

  const handleStartTakeoff = async () => {
    if (!file) {
      alert('Please upload a plan');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);
    formData.append('wall_height', wallHeight);

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      const response = await fetch(`${backendUrl}/api/takeoff/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();
      
      setAnalysis(data);
      setWalls(data.detected_walls || []);
      calculateEstimate(data.detected_walls || []);
    } catch (err) {
      alert('Error analyzing plan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimate = (detectedWalls) => {
    if (!detectedWalls.length) return;

    let totalLinearFeet = 0;
    let totalSqft = 0;
    let cornerCount = 0;
    let radiusCount = 0;

    detectedWalls.forEach(wall => {
      totalLinearFeet += wall.linear_feet || 0;
      totalSqft += wall.sqft || 0;
      cornerCount += wall.corners || 0;
      radiusCount += wall.radius_sections || 0;
    });

    let complexityFactor = 1;
    if (radiusCount > 5 || cornerCount > 20) {
      setComplexity('complex');
      complexityFactor = 1.3;
    } else if (cornerCount > 10) {
      setComplexity('standard');
      complexityFactor = 1.15;
    } else {
      setComplexity('simple');
      complexityFactor = 1;
    }

    const ratePerSqft = baseRate[complexity] * complexityFactor;
    const totalCost = totalSqft * ratePerSqft;

    setEstimate({
      total_sqft: Math.round(totalSqft),
      total_linear_feet: Math.round(totalLinearFeet),
      corners: cornerCount,
      radius_sections: radiusCount,
      complexity_factor: complexityFactor.toFixed(2),
      rate_per_sqft: Math.round(ratePerSqft),
      total_cost: Math.round(totalCost),
      materials: {
        icf_blocks: Math.round(totalSqft / 1.5),
        rebar_lf: Math.round(totalLinearFeet * 0.8),
        concrete_yds: Math.round(totalSqft / 150)
      }
    });
  };

  const addManualWall = () => {
    setWalls([...walls, { id: Date.now(), linear_feet: 0, sqft: 0, corners: 0 }]);
  };

  const updateWall = (id, field, value) => {
    const updated = walls.map(w => 
      w.id === id ? { ...w, [field]: parseFloat(value) || 0 } : w
    );
    setWalls(updated);
    calculateEstimate(updated);
  };

  const removeWall = (id) => {
    const updated = walls.filter(w => w.id !== id);
    setWalls(updated);
    calculateEstimate(updated);
  };

  const exportEstimate = () => {
    if (!estimate) return;

    const pdf = `
ICF TAKEOFF ESTIMATE
====================
Date: ${new Date().toLocaleDateString()}
Format: ${format.toUpperCase()}
Wall Height: ${wallHeight} in

PROJECT SUMMARY
===============
Total Sqft: ${estimate.total_sqft}
Total Linear Feet: ${estimate.total_linear_feet}
Corners: ${estimate.corners}
Radius Sections: ${estimate.radius_sections}
Complexity Level: ${complexity}
Complexity Factor: ${estimate.complexity_factor}x

PRICING
=======
Rate per Sqft: $${estimate.rate_per_sqft}
TOTAL ESTIMATE: $${estimate.total_cost.toLocaleString()}

MATERIALS
=========
ICF Blocks: ${estimate.materials.icf_blocks} units
Rebar: ${estimate.materials.rebar_lf} LF
Concrete: ${estimate.materials.concrete_yds} cubic yards

WALLS
=====
${walls.map((w, i) => `Wall ${i + 1}: ${w.linear_feet} LF, ${w.sqft} sqft, ${w.corners} corners`).join('\n')}
    `;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(pdf));
    element.setAttribute('download', 'icf-estimate.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-orange-600 font-semibold">TOOLS / ICF TAKEOFF</span>
            <span className="bg-orange-600 text-white px-2 py-1 text-xs font-bold rounded">BETA</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ICF TAKEOFF ESTIMATOR</h1>
          <p className="text-gray-600">Early access for contractors. Run it on real jobs, break it if you can, and tell us exactly what's wrong.</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Upload & Settings */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">File Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="amvic">AmVic</option>
                  <option value="fdf">FDF</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>

              {/* Wall Height */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Wall Height</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={wallHeight}
                    onChange={(e) => setWallHeight(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <select className="px-4 py-2 border border-gray-300 rounded-lg">
                    <option>in</option>
                    <option>ft</option>
                  </select>
                </div>
              </div>

              {/* Plan Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Plans</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center cursor-pointer hover:bg-orange-50 transition"
                >
                  <Upload className="mx-auto mb-2 text-orange-600" size={24} />
                  <p className="text-sm text-gray-600">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.amvic,.fdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartTakeoff}
                disabled={!file || loading}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <Play size={18} />
                {loading ? 'ANALYZING...' : 'START AUTOMATIC TAKEOFF'}
              </button>
            </div>

            {/* Walls Editor */}
            {walls.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Detected Walls</h3>
                  <button
                    onClick={addManualWall}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                  >
                    <Plus size={16} /> Add Wall
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {walls.map((wall, idx) => (
                    <div key={wall.id} className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Linear Feet</label>
                        <input
                          type="number"
                          value={wall.linear_feet}
                          onChange={(e) => updateWall(wall.id, 'linear_feet', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Sqft</label>
                        <input
                          type="number"
                          value={wall.sqft}
                          onChange={(e) => updateWall(wall.id, 'sqft', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Corners</label>
                        <input
                          type="number"
                          value={wall.corners}
                          onChange={(e) => updateWall(wall.id, 'corners', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeWall(wall.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Status & Estimate */}
          <div className="col-span-1">
            {/* Status Box */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4">BETA STATUS</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">VERSION</span>
                  <p className="font-semibold">0.1-beta</p>
                </div>
                <div>
                  <span className="text-gray-600">ACCESS</span>
                  <p className="font-semibold">Contractor Only</p>
                </div>
                <div>
                  <span className="text-gray-600">PRICING</span>
                  <p className="font-semibold">Free During Beta</p>
                </div>
                <div>
                  <span className="text-gray-600">FEEDBACK LOOP</span>
                  <p className="font-semibold">Weekly Triage</p>
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 font-semibold">BETA OPEN</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Estimate Result */}
            {estimate && (
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-md p-6">
                <h3 className="font-bold text-gray-900 mb-4">ESTIMATE</h3>
                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Total Sqft</p>
                    <p className="text-2xl font-bold text-gray-900">{estimate.total_sqft}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Complexity</p>
                    <p className="text-sm font-semibold text-orange-700 capitalize">{complexity} ({estimate.complexity_factor}x)</p>
                  </div>
                  <div className="border-t border-orange-200 pt-3">
                    <p className="text-sm text-gray-600">Rate/Sqft</p>
                    <p className="text-lg font-bold text-orange-700">${estimate.rate_per_sqft}</p>
                  </div>
                  <div className="bg-orange-600 text-white rounded p-3 text-center">
                    <p className="text-xs text-orange-100 mb-1">TOTAL ESTIMATE</p>
                    <p className="text-3xl font-bold">${estimate.total_cost.toLocaleString()}</p>
                  </div>
                </div>

                <button
                  onClick={exportEstimate}
                  className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  <Download size={18} />
                  Export Estimate
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
