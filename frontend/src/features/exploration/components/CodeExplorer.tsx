import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip,
    IconButton,
    Collapse,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tooltip,
    Badge,
    Divider,
    ListItemButton
} from '@mui/material';
import {
    Code,
    Class,
    Functions,
    Search,
    ExpandMore,
    ExpandLess,
    Folder,
    LocationOn,
    Visibility,
    Launch,
    Description,
    AccountTree
} from '@mui/icons-material';
// @ts-ignore - JS component without type declarations
import LazyList from '@/components/LazyList';
// @ts-ignore - JSX component without type declarations
import CollapsibleSection from '@/components/CollapsibleSection';
// @ts-ignore - JSX component without type declarations
import TabbedInterface from '@/components/TabbedInterface';
import type { AnalysisData, CodeElement, Usage, Parameter } from '@shared/types';

interface ExtendedCodeElement extends CodeElement {
    elementType?: string;
    icon?: React.ComponentType<any>;
}

interface CodeExplorerProps {
  data?: AnalysisData | null;
  selectedElement?: CodeElement | null;
}

const CodeExplorer: React.FC<CodeExplorerProps> = memo(({ 
  data = null, 
  selectedElement: propSelectedElement = null 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedElement, setSelectedElement] = useState<ExtendedCodeElement | null>(propSelectedElement as ExtendedCodeElement);
    const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());
    const [filterType, setFilterType] = useState<'all' | 'module' | 'class' | 'function'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'type' | 'file' | 'usages'>('name');

    // Update selected element when prop changes
    useEffect(() => {
        if (propSelectedElement) {
            setSelectedElement(propSelectedElement as ExtendedCodeElement);
            setExpandedElements(prev => new Set([...prev, propSelectedElement.id]));
        }
    }, [propSelectedElement]);

    // Sample data structure to match AnalysisData with full details
    const sampleData: any = useMemo(() => ({
        project_name: 'Sample Project',
        total_files: 5,
        total_lines: 500,
        dependencies: [],
        analysis_metadata: {},
        modules: [
            {
                id: 'test_module',
                name: 'test_module',
                type: 'module',
                location: { file_path: '/project/test_module.py', line_number: 1, column_number: 0, end_line: 100, end_column: 0 },
                docstring: 'Test module for unit testing',
                parameters: [],
                decorators: [],
                dependencies: ['unittest', 'mock'],
                usages: [
                    {
                        location: { file_path: '/project/main.py', line_number: 5, column_number: 1, end_line: 5, end_column: 20 },
                        context: 'import test_module',
                        usage_type: 'import'
                    }
                ],
                metadata: {}
            }
        ],
        classes: [
            {
                id: 'test_class',
                name: 'TestClass',
                type: 'class',
                location: { file_path: '/project/models.py', line_number: 10, column_number: 0, end_line: 50, end_column: 0 },
                docstring: 'A test class for demonstration purposes.\n\nThis class provides methods for testing various features.',
                parameters: [
                    { name: 'name', type_hint: 'str' },
                    { name: 'value', type_hint: 'int', default_value: '0' }
                ],
                decorators: ['dataclass'],
                dependencies: ['dataclasses'],
                usages: [
                    {
                        location: { file_path: '/project/views.py', line_number: 15, column_number: 8, end_line: 15, end_column: 45 },
                        context: 'instance = TestClass(name="test", value=42)',
                        usage_type: 'instantiation'
                    }
                ],
                metadata: {}
            }
        ],
        functions: [
            {
                id: 'test_function',
                name: 'test_function',
                type: 'function',
                location: { file_path: '/project/utils.py', line_number: 25, column_number: 0, end_line: 40, end_column: 0 },
                docstring: 'A test function that processes data.\n\nArgs:\n    data: List of strings to process\n    options: Optional configuration dictionary\n\nReturns:\n    Boolean indicating success',
                parameters: [
                    { name: 'data', type_hint: 'List[str]' },
                    { name: 'options', type_hint: 'Optional[Dict]', default_value: 'None' }
                ],
                return_type: 'bool',
                decorators: ['staticmethod'],
                dependencies: ['typing'],
                usages: [
                    {
                        location: { file_path: '/project/main.py', line_number: 45, column_number: 12, end_line: 45, end_column: 40 },
                        context: 'result = test_function(input_data)',
                        usage_type: 'call'
                    }
                ],
                metadata: {}
            }
        ]
    }), []);

    const displayData = data || sampleData;

    // Combine modules, classes, and functions into a single code_elements array
    const codeElements = useMemo(() => {
        if (!displayData) return [];
        
        // Check if data has the new structure (modules, classes, functions)
        if (displayData.modules || displayData.classes || displayData.functions) {
            const modules = (displayData.modules || []).map((el: CodeElement) => ({
                ...el,
                type: 'module',
                elementType: 'module'
            }));
            const classes = (displayData.classes || []).map((el: CodeElement) => ({
                ...el,
                type: 'class',
                elementType: 'class'
            }));
            const functions = (displayData.functions || []).map((el: CodeElement) => ({
                ...el,
                type: 'function',
                elementType: 'function'
            }));
            return [...modules, ...classes, ...functions];
        }
        
        // Check for nested data structure
        if (displayData.data) {
            const { modules = [], classes = [], functions = [] } = displayData.data;
            const mods = modules.map((el: CodeElement) => ({
                ...el,
                type: 'module',
                elementType: 'module'
            }));
            const cls = classes.map((el: CodeElement) => ({
                ...el,
                type: 'class',
                elementType: 'class'
            }));
            const funcs = functions.map((el: CodeElement) => ({
                ...el,
                type: 'function',
                elementType: 'function'
            }));
            return [...mods, ...cls, ...funcs];
        }
        
        return [];
    }, [displayData]);

    // Process and filter elements
    const processedElements = useMemo(() => {
        if (!codeElements || codeElements.length === 0) {
            return { all: [], modules: 0, classes: 0, functions: 0 };
        }

        const elements = codeElements.map((el: any) => ({
            ...el,
            elementType: el.type || el.elementType,
            icon: (el.type === 'module' || el.elementType === 'module') ? Folder : 
                  (el.type === 'class' || el.elementType === 'class') ? Class : Functions
        }));

        // Filter by type
        let filtered = elements;
        if (filterType !== 'all') {
            filtered = elements.filter((el: any) => el.elementType === filterType);
        }

        // Filter by search term
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter((el: any) =>
                el.name.toLowerCase().includes(term) ||
                (el.docstring && el.docstring.toLowerCase().includes(term)) ||
                (el.location?.file_path && el.location.file_path.toLowerCase().includes(term))
            );
        }

        // Sort elements
        filtered.sort((a: any, b: any) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'type':
                    return a.elementType.localeCompare(b.elementType);
                case 'file':
                    return (a.location?.file_path || '').localeCompare(b.location?.file_path || '');
                case 'usages':
                    return (b.usages?.length || 0) - (a.usages?.length || 0);
                default:
                    return 0;
            }
        });

        const counts = {
            modules: elements.filter((el: any) => el.type === 'module' || el.elementType === 'module').length,
            classes: elements.filter((el: any) => el.type === 'class' || el.elementType === 'class').length,
            functions: elements.filter((el: any) => el.type === 'function' || el.elementType === 'function').length
        };

        return {
            all: filtered,
            ...counts
        };
    }, [codeElements, searchTerm, filterType, sortBy]);

    const handleElementClick = useCallback((element: ExtendedCodeElement) => {
        setSelectedElement(element);
    }, []);

    const handleExpandToggle = useCallback((elementId: string) => {
        setExpandedElements(prev => {
            const newExpanded = new Set(prev);
            if (newExpanded.has(elementId)) {
                newExpanded.delete(elementId);
            } else {
                newExpanded.add(elementId);
            }
            return newExpanded;
        });
    }, []);

    const getElementColor = useCallback((elementType: string) => {
        switch (elementType) {
            case 'module': return '#1976d2';
            case 'class': return '#388e3c';
            case 'function': return '#f57c00';
            default: return '#666';
        }
    }, []);

    const formatFilePath = useCallback((filePath?: string) => {
        if (!filePath) return 'Unknown';
        const parts = filePath.split('/');
        return parts.length > 3 ? `.../${parts.slice(-2).join('/')}` : filePath;
    }, []);

    const renderElementItem = useCallback((element: ExtendedCodeElement) => {
        const isExpanded = expandedElements.has(element.id);
        const IconComponent = element.icon || Code;

        return (
            <Box key={element.id}>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={() => handleElementClick(element)}
                        sx={{
                            borderLeft: `4px solid ${getElementColor(element.elementType || element.type)}`,
                            mb: 1,
                            backgroundColor: selectedElement?.id === element.id ? '#f5f5f5' : 'transparent',
                            '&:hover': { backgroundColor: '#f0f0f0' }
                        }}
                    >
                        <ListItemIcon>
                            <IconComponent sx={{ color: getElementColor(element.elementType || element.type) }} />
                        </ListItemIcon>
                        <ListItemText
                            primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        {element.name}
                                    </Typography>
                                    <Chip
                                        label={element.elementType || element.type}
                                        size="small"
                                        sx={{
                                            backgroundColor: getElementColor(element.elementType || element.type),
                                            color: 'white',
                                            fontSize: '0.7rem'
                                        }}
                                    />
                                    {element.usages && element.usages.length > 0 && (
                                        <Badge
                                            badgeContent={element.usages.length}
                                            color="secondary"
                                            sx={{ ml: 1 }}
                                        >
                                            <Visibility fontSize="small" />
                                        </Badge>
                                    )}
                                </Box>
                            }
                            secondary={
                                <Box sx={{ mt: 0.5 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                        {formatFilePath(element.location?.file_path)}
                                        {element.location?.line_number && ` : Line ${element.location.line_number}`}
                                    </Typography>
                                    {element.docstring && (
                                        <Typography 
                                            variant="body2" 
                                            color="text.secondary" 
                                            sx={{ 
                                                fontStyle: 'italic', 
                                                mt: 0.5, 
                                                fontSize: '0.75rem',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical'
                                            }}
                                        >
                                            {element.docstring.split('\n')[0]}
                                        </Typography>
                                    )}
                                </Box>
                            }
                        />
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleExpandToggle(element.id);
                            }}
                        >
                            {isExpanded ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                    </ListItemButton>
                </ListItem>

                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                        <CollapsibleSection
                            title="Element Details"
                            icon={<Description />}
                            defaultExpanded={true}
                            variant="outlined"
                        >
                            {element.parameters && element.parameters.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        Parameters:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {element.parameters.map((param: Parameter, paramIndex: number) => (
                                            <Chip
                                                key={paramIndex}
                                                label={`${param.name}${param.type_hint ? `: ${param.type_hint}` : ''}${param.default_value ? ` = ${param.default_value}` : ''}`}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: '0.7rem' }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {element.return_type && (
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Returns:</strong> <code>{element.return_type}</code>
                                </Typography>
                            )}

                            {element.decorators && element.decorators.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        Decorators:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {element.decorators.map((decorator: string, decoratorIndex: number) => (
                                            <Chip
                                                key={decoratorIndex}
                                                label={`@${decorator}`}
                                                size="small"
                                                color="secondary"
                                                sx={{ fontSize: '0.7rem' }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {element.dependencies && element.dependencies.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        Dependencies ({element.dependencies.length}):
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {element.dependencies.slice(0, 10).map((dep: string, depIndex: number) => (
                                            <Chip
                                                key={depIndex}
                                                label={dep}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: '0.7rem' }}
                                            />
                                        ))}
                                        {element.dependencies.length > 10 && (
                                            <Chip
                                                label={`+${element.dependencies.length - 10} more`}
                                                size="small"
                                                sx={{ fontSize: '0.7rem' }}
                                            />
                                        )}
                                    </Box>
                                </Box>
                            )}
                        </CollapsibleSection>

                        {element.usages && element.usages.length > 0 && (
                            <CollapsibleSection
                                title="Usage Locations"
                                icon={<Visibility />}
                                badge={element.usages.length}
                                defaultExpanded={element.usages.length <= 5}
                                variant="outlined"
                            >
                                <List dense sx={{ p: 0 }}>
                                    {element.usages.slice(0, 5).map((usage: Usage, usageIndex: number) => (
                                        <ListItem key={usageIndex} sx={{ pl: 0, py: 0.5 }}>
                                            <ListItemIcon sx={{ minWidth: 32 }}>
                                                <LocationOn fontSize="small" color="action" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                                                            {formatFilePath(usage.location.file_path)}
                                                        </Typography>
                                                        <Chip
                                                            label={`Line ${usage.location.line_number}`}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ fontSize: '0.6rem', height: 18 }}
                                                        />
                                                        <Chip
                                                            label={usage.usage_type}
                                                            size="small"
                                                            color="primary"
                                                            sx={{ fontSize: '0.6rem', height: 18 }}
                                                        />
                                                    </Box>
                                                }
                                                secondary={
                                                    usage.context && (
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                            sx={{
                                                                fontFamily: 'monospace',
                                                                fontSize: '0.7rem',
                                                                backgroundColor: '#f5f5f5',
                                                                padding: '2px 4px',
                                                                borderRadius: '2px',
                                                                mt: 0.5,
                                                                display: 'block',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {usage.context}
                                                        </Typography>
                                                    )
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                    {element.usages.length > 5 && (
                                        <Typography variant="body2" color="text.secondary" sx={{ pl: 4, fontStyle: 'italic' }}>
                                            +{element.usages.length - 5} more usages...
                                        </Typography>
                                    )}
                                </List>
                            </CollapsibleSection>
                        )}
                    </Box>
                </Collapse>
            </Box>
        );
    }, [expandedElements, selectedElement, handleElementClick, handleExpandToggle, getElementColor, formatFilePath]);

    const renderSelectedElementDetails = () => {
        if (!selectedElement) {
            return (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Code sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        Select an element to view details
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Click on any element from the list to see detailed information and usage patterns
                    </Typography>
                </Box>
            );
        }

        const IconComponent = selectedElement.icon || Code;
        const elementType = selectedElement.elementType || selectedElement.type;

        return (
            <Box sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <IconComponent sx={{ fontSize: 32, color: getElementColor(elementType) }} />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            {selectedElement.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                            <Chip
                                label={elementType}
                                size="small"
                                sx={{
                                    backgroundColor: getElementColor(elementType),
                                    color: 'white'
                                }}
                            />
                            <Typography variant="body2" color="text.secondary">
                                {formatFilePath(selectedElement.location?.file_path)}
                                {selectedElement.location?.line_number && ` : Line ${selectedElement.location.line_number}`}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                <Divider sx={{ mb: 3 }} />

                <TabbedInterface
                    tabs={[
                        {
                            id: 'overview',
                            label: 'Overview',
                            icon: <Description />,
                            content: (
                                <Box>
                                    {/* Documentation */}
                                    {selectedElement.docstring && (
                                        <CollapsibleSection
                                            title="Documentation"
                                            icon={<Description />}
                                            defaultExpanded={true}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontFamily: 'monospace',
                                                    backgroundColor: '#f5f5f5',
                                                    padding: 2,
                                                    borderRadius: 1,
                                                    whiteSpace: 'pre-wrap',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                {selectedElement.docstring}
                                            </Typography>
                                        </CollapsibleSection>
                                    )}

                                    {/* Parameters */}
                                    {selectedElement.parameters && selectedElement.parameters.length > 0 && (
                                        <CollapsibleSection
                                            title={`Parameters (${selectedElement.parameters.length})`}
                                            badge={selectedElement.parameters.length}
                                            defaultExpanded={selectedElement.parameters.length <= 5}
                                        >
                                            <List dense>
                                                {selectedElement.parameters.map((param: Parameter, index: number) => (
                                                    <ListItem key={index} sx={{ pl: 0 }}>
                                                        <ListItemText
                                                            primary={
                                                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                                    <strong>{param.name}</strong>
                                                                    {param.type_hint && <span style={{ color: '#666' }}>: {param.type_hint}</span>}
                                                                    {param.default_value && <span style={{ color: '#888' }}> = {param.default_value}</span>}
                                                                </Typography>
                                                            }
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </CollapsibleSection>
                                    )}

                                    {/* Return Type */}
                                    {selectedElement.return_type && (
                                        <CollapsibleSection
                                            title="Return Type"
                                            defaultExpanded={true}
                                        >
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#666' }}>
                                                {selectedElement.return_type}
                                            </Typography>
                                        </CollapsibleSection>
                                    )}

                                    {/* Decorators */}
                                    {selectedElement.decorators && selectedElement.decorators.length > 0 && (
                                        <CollapsibleSection
                                            title="Decorators"
                                            badge={selectedElement.decorators.length}
                                            defaultExpanded={true}
                                        >
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                {selectedElement.decorators.map((decorator: string, index: number) => (
                                                    <Chip
                                                        key={index}
                                                        label={`@${decorator}`}
                                                        color="secondary"
                                                        sx={{ fontFamily: 'monospace' }}
                                                    />
                                                ))}
                                            </Box>
                                        </CollapsibleSection>
                                    )}

                                    {/* No details available */}
                                    {!selectedElement.docstring && 
                                     (!selectedElement.parameters || selectedElement.parameters.length === 0) && 
                                     !selectedElement.return_type && 
                                     (!selectedElement.decorators || selectedElement.decorators.length === 0) && (
                                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                            No additional details available for this element.
                                        </Typography>
                                    )}
                                </Box>
                            )
                        },
                        {
                            id: 'usages',
                            label: 'Usages',
                            icon: <Visibility />,
                            badge: selectedElement.usages?.length || 0,
                            disabled: !selectedElement.usages || selectedElement.usages.length === 0,
                            content: (
                                <Box>
                                    {selectedElement.usages && selectedElement.usages.length > 0 ? (
                                        <LazyList
                                            items={selectedElement.usages}
                                            initialBatchSize={10}
                                            batchSize={15}
                                            maxItems={100}
                                            renderItem={(usage: Usage, index: number) => (
                                                <ListItem key={index} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 1 }}>
                                                    <ListItemIcon>
                                                        <LocationOn color="action" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                                    {formatFilePath(usage.location.file_path)}
                                                                </Typography>
                                                                <Chip
                                                                    label={`Line ${usage.location.line_number}${usage.location.column_number ? `:${usage.location.column_number}` : ''}`}
                                                                    size="small"
                                                                    variant="outlined"
                                                                />
                                                                <Chip
                                                                    label={usage.usage_type}
                                                                    size="small"
                                                                    color="primary"
                                                                />
                                                            </Box>
                                                        }
                                                        secondary={
                                                            usage.context && (
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        fontFamily: 'monospace',
                                                                        fontSize: '0.8rem',
                                                                        backgroundColor: '#f8f8f8',
                                                                        padding: 1,
                                                                        borderRadius: 1,
                                                                        border: '1px solid #e0e0e0',
                                                                        whiteSpace: 'pre-wrap',
                                                                        wordBreak: 'break-all'
                                                                    }}
                                                                >
                                                                    {usage.context}
                                                                </Typography>
                                                            )
                                                        }
                                                    />
                                                    <Tooltip title="Navigate to this usage">
                                                        <IconButton
                                                            onClick={() => {
                                                                console.log('Navigate to usage:', usage.location);
                                                            }}
                                                        >
                                                            <Launch />
                                                        </IconButton>
                                                    </Tooltip>
                                                </ListItem>
                                            )}
                                            sx={{ p: 0 }}
                                        />
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            No usages found for this element.
                                        </Typography>
                                    )}
                                </Box>
                            )
                        },
                        {
                            id: 'dependencies',
                            label: 'Dependencies',
                            icon: <AccountTree />,
                            badge: selectedElement.dependencies?.length || 0,
                            content: (
                                <Box>
                                    {selectedElement.dependencies && selectedElement.dependencies.length > 0 ? (
                                        <LazyList
                                            items={selectedElement.dependencies}
                                            initialBatchSize={20}
                                            batchSize={30}
                                            renderItem={(dep: string, index: number) => (
                                                <ListItem key={index} sx={{ pl: 0 }}>
                                                    <ListItemIcon>
                                                        <AccountTree fontSize="small" color="action" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={
                                                            <Chip
                                                                label={dep}
                                                                variant="outlined"
                                                                onClick={() => {
                                                                    console.log('Navigate to dependency:', dep);
                                                                }}
                                                                sx={{ cursor: 'pointer' }}
                                                            />
                                                        }
                                                    />
                                                </ListItem>
                                            )}
                                            sx={{ p: 0 }}
                                        />
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            No dependencies found for this element.
                                        </Typography>
                                    )}
                                </Box>
                            )
                        }
                    ]}
                    defaultTab={0}
                    lazyLoad={true}
                />
            </Box>
        );
    };

    return (
        <Box sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Code />
                    Code Explorer
                </Typography>

                <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 250px)', minHeight: '500px', maxHeight: '800px' }}>
                    {/* Left Panel - Element List */}
                    <Box sx={{ 
                        width: '400px', 
                        minWidth: '350px',
                        borderRight: '1px solid #e0e0e0', 
                        pr: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* Search and Filters */}
                        <Box sx={{ mb: 3, flexShrink: 0 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search elements..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                                }}
                                sx={{ mb: 2 }}
                            />

                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel>Type</InputLabel>
                                    <Select
                                        value={filterType}
                                        label="Type"
                                        onChange={(e) => setFilterType(e.target.value as any)}
                                    >
                                        <MenuItem value="all">All Types</MenuItem>
                                        <MenuItem value="module">Modules</MenuItem>
                                        <MenuItem value="class">Classes</MenuItem>
                                        <MenuItem value="function">Functions</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel>Sort By</InputLabel>
                                    <Select
                                        value={sortBy}
                                        label="Sort By"
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                    >
                                        <MenuItem value="name">Name</MenuItem>
                                        <MenuItem value="type">Type</MenuItem>
                                        <MenuItem value="file">File</MenuItem>
                                        <MenuItem value="usages">Usage Count</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                        </Box>

                        {/* Statistics */}
                        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1, flexShrink: 0 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Statistics
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Chip
                                    icon={<Folder />}
                                    label={`${processedElements.modules} Modules`}
                                    size="small"
                                    color="primary"
                                />
                                <Chip
                                    icon={<Class />}
                                    label={`${processedElements.classes} Classes`}
                                    size="small"
                                    color="success"
                                />
                                <Chip
                                    icon={<Functions />}
                                    label={`${processedElements.functions} Functions`}
                                    size="small"
                                    color="warning"
                                />
                            </Box>
                        </Box>

                        {/* Element List with proper scrolling */}
                        <Box sx={{ 
                            flex: 1,
                            overflow: 'auto',
                            minHeight: 0,
                            '&::-webkit-scrollbar': {
                                width: '8px',
                            },
                            '&::-webkit-scrollbar-track': {
                                backgroundColor: '#f1f1f1',
                                borderRadius: '4px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                backgroundColor: '#c1c1c1',
                                borderRadius: '4px',
                                '&:hover': {
                                    backgroundColor: '#a8a8a8',
                                },
                            },
                        }}>
                            {processedElements.all.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {searchTerm ? 'No elements match your search' : 'No elements found'}
                                    </Typography>
                                </Box>
                            ) : (
                                <List sx={{ p: 0 }}>
                                    {processedElements.all.map(renderElementItem)}
                                </List>
                            )}
                        </Box>
                    </Box>

                    {/* Right Panel - Element Details */}
                    <Box sx={{ 
                        flex: 1, 
                        overflow: 'auto',
                        minHeight: 0,
                        '&::-webkit-scrollbar': {
                            width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            backgroundColor: '#f1f1f1',
                            borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: '#c1c1c1',
                            borderRadius: '4px',
                            '&:hover': {
                                backgroundColor: '#a8a8a8',
                            },
                        },
                    }}>
                        {renderSelectedElementDetails()}
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
});

CodeExplorer.displayName = 'CodeExplorer';

export default CodeExplorer;