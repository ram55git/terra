import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '../utils/categories';

const TileGrid = ({ selectedTiles, onTileToggle, mode }) => {
  const { t } = useTranslation();
  
  const tiles = Object.keys(CATEGORIES).map(tileId => ({
    tileId,
    categoryId: CATEGORIES[tileId].categoryId
  }));

  const selectedColor = mode === 'Complaint' 
    ? 'bg-red-500 hover:bg-red-600' 
    : 'bg-green-500 hover:bg-green-600';

  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((tile) => {
        const translationKey = `categories.${tile.tileId}_${mode.toLowerCase()}`;
        const label = t(translationKey);
        
        return (
          <button
            key={tile.tileId}
            onClick={() => onTileToggle(tile.tileId)}
            className={`aspect-square rounded-lg font-medium text-white transition-all transform hover:scale-105 active:scale-95 shadow-md text-[10px] sm:text-xs p-1 sm:p-2 flex items-center justify-center text-center leading-tight ${
              selectedTiles[tile.tileId]
                ? selectedColor
                : 'bg-gray-400 hover:bg-gray-500'
            }`}
            title={label}
          >
            <span className="break-words">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default TileGrid;

