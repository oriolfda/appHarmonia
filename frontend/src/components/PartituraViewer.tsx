import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fabric } from 'fabric';
import { 
  partituresAPI, 
  anotacionsAPI, 
  comentarisAPI, 
  Partitura, 
  Anotacio,
  Comentari,
  authAPI 
} from '../services/api';

const PartituraViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [partitura, setPartitura] = useState<Partitura | null>(null);
  const [anotacions, setAnotacions] = useState<Anotacio[]>([]);
  const [comentaris, setComentaris] = useState<Comentari[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [einaActual, setEinaActual] = useState<'seleccio' | 'llapis' | 'linia' | 'text' | 'rectangle'>('llapis');
  const [colorActual, setColorActual] = useState('#ff0000');
  const [gruixActual, setGruixActual] = useState(2);
  const [nouComentari, setNouComentari] = useState('');
  const [enviantComentari, setEnviantComentari] = useState(false);
  const [usuariActual] = useState(authAPI.getCurrentUser());

  // Carregar dades
  useEffect(() => {
    if (id) {
      loadPartitura();
      loadAnotacions();
      loadComentaris();
    }
  }, [id]);

  const loadPartitura = async () => {
    try {
      const data = await partituresAPI.getById(parseInt(id!));
      setPartitura(data.partitura);
    } catch (err: any) {
      setError(err.message || 'Error carregant partitura');
    }
  };

  const loadAnotacions = async () => {
    try {
      const data = await anotacionsAPI.getByPartitura(parseInt(id!));
      setAnotacions(data.anotacions);
    } catch (err: any) {
      console.error('Error carregant anotacions:', err);
    }
  };

  const loadComentaris = async () => {
    try {
      const data = await comentarisAPI.getByPartitura(parseInt(id!));
      setComentaris(data.comentaris);
    } catch (err: any) {
      console.error('Error carregant comentaris:', err);
    } finally {
      setLoading(false);
    }
  };

  // Inicialitzar canvas
  useEffect(() => {
    if (!canvasRef.current || !partitura) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: '#f8f9fa',
      selection: true,
      preserveObjectStacking: true,
    });

    // Carregar imatge de fons
    fabric.Image.fromURL(partitura.imatge_url, (img) => {
      if (img.width && img.height) {
        // Ajustar mida màxima
        const maxWidth = 800;
        const maxHeight = 600;
        let scale = 1;
        
        if (img.width > maxWidth) {
          scale = maxWidth / img.width;
        }
        if (img.height * scale > maxHeight) {
          scale = maxHeight / img.height;
        }
        
        img.scale(scale);
        fabricCanvas.setWidth(img.width! * scale);
        fabricCanvas.setHeight(img.height! * scale);
        fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas));
        
        // Carregar anotacions existents
        carregarAnotacionsAlCanvas(fabricCanvas);
      }
    });

    setCanvas(fabricCanvas);

    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
    };
  }, [partitura]);

  // Carregar anotacions al canvas
  const carregarAnotacionsAlCanvas = (fabricCanvas: fabric.Canvas) => {
    anotacions.forEach(anotacio => {
      try {
        fabricCanvas.loadFromJSON(anotacio.dades_anotacio, () => {
          // Aplicar estils específics per a cada objecte
          fabricCanvas.getObjects().forEach(obj => {
            // Mantenir les propietats originals
            if (anotacio.color) {
              if (obj instanceof fabric.Line) {
                obj.set('stroke', anotacio.color);
              } else if (obj instanceof fabric.Textbox || obj instanceof fabric.IText) {
                obj.set('fill', anotacio.color);
              } else if (obj instanceof fabric.Rect || obj instanceof fabric.Circle) {
                obj.set('fill', 'transparent');
                obj.set('stroke', anotacio.color);
              }
            }
            
            // Fer les anotacions no seleccionables (només visualització)
            obj.set('selectable', false);
            obj.set('evented', false);
          });
          fabricCanvas.renderAll();
        });
      } catch (error) {
        console.error('Error carregant anotació al canvas:', error);
      }
    });
  };

  // Configurar eina seleccionada
  useEffect(() => {
    if (!canvas) return;

    canvas.isDrawingMode = einaActual === 'llapis';
    canvas.selection = einaActual === 'seleccio';

    if (einaActual === 'llapis') {
      canvas.freeDrawingBrush.width = gruixActual;
      canvas.freeDrawingBrush.color = colorActual;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    }
  }, [canvas, einaActual, colorActual, gruixActual]);

  // Afegir línia
  const afegirLinia = () => {
    if (!canvas) return;
    
    const line = new fabric.Line([50, 50, 200, 50], {
      stroke: colorActual,
      strokeWidth: gruixActual,
      selectable: true,
    });
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
  };

  // Afegir rectangle
  const afegirRectangle = () => {
    if (!canvas) return;
    
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 60,
      fill: 'transparent',
      stroke: colorActual,
      strokeWidth: gruixActual,
      selectable: true,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  // Afegir text
  const afegirText = () => {
    if (!canvas) return;
    
    const text = new fabric.Textbox('Escriu aquí...', {
      left: 100,
      top: 100,
      fontSize: 16,
      fill: colorActual,
      width: 150,
      selectable: true,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    canvas.renderAll();
  };

  // Guardar anotació actual
  const guardarAnotacio = async () => {
    if (!canvas || !partitura) return;

    try {
      const anotacioData = canvas.toJSON();
      
      await anotacionsAPI.create(
        partitura.id,
        anotacioData,
        colorActual,
        einaActual
      );
      
      alert('Anotació guardada correctament!');
      loadAnotacions(); // Recarregar llista d'anotacions
    } catch (err: any) {
      alert(err.message || 'Error guardant anotació');
    }
  };

  // Enviar comentari
  const enviarComentari = async () => {
    if (!nouComentari.trim() || !partitura) return;

    setEnviantComentari(true);
    try {
      await comentarisAPI.create(partitura.id, nouComentari);
      setNouComentari('');
      loadComentaris(); // Recarregar comentaris
    } catch (err: any) {
      alert(err.message || 'Error enviant comentari');
    } finally {
      setEnviantComentari(false);
    }
  };

  // Netejar canvas (només les anotacions noves)
  const netejarCanvas = () => {
    if (!canvas) return;
    
    // Eliminar tots els objectes (les anotacions guardades es carregaran de nou)
    canvas.clear();
    
    // Recarregar la imatge de fons
    if (partitura) {
      fabric.Image.fromURL(partitura.imatge_url, (img) => {
        if (img.width && img.height) {
          const maxWidth = 800;
          const scale = maxWidth / img.width;
          img.scale(scale);
          canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
          
          // Recarregar anotacions existents
          carregarAnotacionsAlCanvas(canvas);
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-600">Carregant partitura...</p>
      </div>
    );
  }

  if (error || !partitura) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-2">❌ {error || 'Partitura no trobada'}</div>
        <button 
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          ← Tornar a la llista
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Capçalera */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">{partitura.titol}</h1>
            {partitura.descripcio && (
              <p className="text-gray-600 mt-2">{partitura.descripcio}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span>👤 {partitura.nom_display || partitura.nom_usuari}</span>
              <span>📅 {new Date(partitura.creat_a).toLocaleDateString('ca-ES')}</span>
              <span>✏️ {anotacions.length} anotacions</span>
              <span>💬 {comentaris.length} comentaris</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              ← Tornar
            </button>
            <a 
              href={partitura.imatge_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              🔍 Imatge original
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna esquerra: Editor */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            {/* Barra d'eines */}
            <div className="bg-gray-100 p-4 rounded-t-lg">
              <div className="flex flex-wrap gap-3 items-center">
                <button 
                  className={`px-3 py-2 rounded ${einaActual === 'seleccio' ? 'bg-blue-500 text-white' : 'bg-white'}`}
                  onClick={() => setEinaActual('seleccio')}
                >
                  ✋ Seleccionar
                </button>
                
                <button 
                  className={`px-3 py-2 rounded ${einaActual === 'llapis' ? 'bg-blue-500 text-white' : 'bg-white'}`}
                  onClick={() => setEinaActual('llapis')}
                >
                  ✏️ Llapis
                </button>
                
                <button 
                  className="px-3 py-2 bg-white rounded"
                  onClick={afegirLinia}
                >
                  📏 Línia
                </button>
                
                <button 
                  className="px-3 py-2 bg-white rounded"
                  onClick={afegirRectangle}
                >
                  ▭ Rectangle
                </button>
                
                <button 
                  className="px-3 py-2 bg-white rounded"
                  onClick={afegirText}
                >
                  🔤 Text
                </button>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm">Color:</label>
                  <input 
                    type="color" 
                    value={colorActual}
                    onChange={(e) => setColorActual(e.target.value)}
                    className="w-8 h-8 cursor-pointer"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm">Gruix:</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={gruixActual}
                    onChange={(e) => setGruixActual(parseInt(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm">{gruixActual}px</span>
                </div>
                
                <button 
                  className="px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                  onClick={netejarCanvas}
                >
                  🗑️ Netejar
                </button>
                
                <button 
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  onClick={guardarAnotacio}
                >
                  💾 Guardar anotació
                </button>
              </div>
            </div>
            
            {/* Canvas */}
            <div className="p-4">
              <div className="border border-gray-300 rounded-lg overflow-auto">
                <canvas ref={canvasRef} />
              </div>
              <p className="text-sm text-gray-500 mt-2 text-center">
                Dibuixa sobre la partitura per indicar correccions o suggerències
              </p>
            </div>
          </div>
        </div>

        {/* Columna dreta: Comentaris i anotacions */}
        <div className="space-y-6">
          {/* Comentaris */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-4">💬 Comentaris</h3>
            
            <div className="mb-4">
              <textarea
                value={nouComentari}
                onChange={(e) => setNouComentari(e.target.value)}
                placeholder="Escriu un comentari..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                disabled={enviantComentari}
              />
              <button
                onClick={enviarComentari}
                disabled={!nouComentari.trim() || enviantComentari}
                className="mt-2 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {enviantComentari ? 'Enviant...' : 'Enviar comentari'}
              </button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {comentaris.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Encara no hi ha comentaris</p>
              ) : (
                comentaris.map(comentari => (
                  <div key={comentari.id} className="border-b pb-3 last:border-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium">{comentari.nom_display || comentari.nom_usuari}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comentari.creat_a).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-700">{comentari.comentari}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Anotacions existents */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-4">✏️ Anotacions existents</h3>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {anotacions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Encara no hi ha anotacions</p>
              ) : (
                anotacions.map(anotacio => (
                  <div key={anotacio.id} className="border-l-4 pl-3 py-2" style={{ borderLeftColor: anotacio.color }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{anotacio.nom_display || anotacio.nom_usuari}</div>
                        <div className="text-xs text-gray-500 capitalize">{anotacio.eina_utilitzada}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(anotacio.creat_a).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {anotacio.acceptada && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✓ Acceptada</span>
                      )}
                      {anotacio.revisada && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">👁️ Revisada</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartituraViewer;