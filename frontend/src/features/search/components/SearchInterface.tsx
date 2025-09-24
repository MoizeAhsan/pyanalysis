import { type FC } from 'react';
import { EnhancedSearchInterface } from '../../../components/EnhancedSearchInterface';
import type { AnalysisData, CodeElement } from '@shared/types';

interface SearchInterfaceProps {
  data: AnalysisData;
  onElementSelect: (element: CodeElement) => void;
  height?: string | number;
}

const SearchInterface: FC<SearchInterfaceProps> = ({ data, onElementSelect, height = '100%' }) => {
  return (
    <EnhancedSearchInterface 
      data={data} 
      onElementSelect={onElementSelect}
      height={height}
    />
  );
};

export default SearchInterface;