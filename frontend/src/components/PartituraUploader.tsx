import React, { useState } from 'react';
import { partituresAPI } from '../services/api';

interface PartituraUploaderProps {
  onUploadSuccess: () => void;
}

const PartituraUploader: React.FC<PartituraUploaderProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [titol, setTitol] = useState('');
  const [descripcio, setDescripcio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validar mida (màxim 15MB)
      if (selectedFile.size > 15 * 1024 * 1024) {
        setError('El fitxer és massa gran. Màxim 15MB');
        return;
      }

      // Validar tipus
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Només es permeten imatges (JPG, PNG, GIF, BMP, WEBP)');
        return;
      }

      setFile(selectedFile);
      setError('');
      
      // Omplir automàticament el títol amb el nom del fitxer
      if (!titol) {
        const fileNameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
        setTitol(fileNameWithoutExt);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Selecciona un fitxer');
      return;
    }

    if (!titol.trim()) {
      setError('El títol és obligatori');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await partituresAPI.upload(file, titol, descripcio);
      setSuccess('Partitura pujada correctament!');
      setFile(null);
      setTitol('');
      setDescripcio('');
      onUploadSuccess();
      
      // Netejar missatge d'èxit després de 3 segons
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error pujant la partitura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">📤 Pujar Nova Partitura</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="file">
            Selecciona una imatge *
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
            <input
              id="file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <label htmlFor="file" className="cursor-pointer">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-lg mb-1">
                {file ? file.name : 'Fes clic per seleccionar una imatge'}
              </p>
              <p className="text-sm text-gray-500">
                Suporta: JPG, PNG, GIF, BMP, WEBP • Màxim 15MB
              </p>
            </label>
            
            {file && (
              <div className="mt-4">
                <div className="flex items-center justify-center">
                  <div className="w-32 h-32 bg-gray-100 rounded overflow-hidden">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Vista prèvia" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="mt-2 text-sm text-red-500 hover:text-red-600"
                >
                  Eliminar selecció
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="titol">
            Títol *
          </label>
          <input
            id="titol"
            type="text"
            value={titol}
            onChange={(e) => setTitol(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Exercici d'harmonia - Acords principals"
            required
            disabled={loading}
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2" htmlFor="descripcio">
            Descripció (opcional)
          </label>
          <textarea
            id="descripcio"
            value={descripcio}
            onChange={(e) => setDescripcio(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descriu la partitura o indica què vols que es corregeixi..."
            rows={3}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              Pujant...
            </>
          ) : (
            '📤 Pujar Partitura'
          )}
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-500">
        <p>La partitura serà visible per a tots els usuaris per defecte.</p>
        <p>Altres usuaris podran fer anotacions i comentaris.</p>
      </div>
    </div>
  );
};

export default PartituraUploader;