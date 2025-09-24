import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
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
    ListItemButton
} from '@mui/material';
import {
    Code,
    Class,
    Functions,
    Search,
    ExpandMore,
    ExpandLess,
    Folder
} from '@mui/icons-material';
import type { AnalysisData, CodeElement } from '@shared/types';

interface CodeExplorerProps {
  data?: AnalysisData | null;
  selectedElement?: CodeElement | null;
}

const CodeExplorer: React.FC<CodeExplorerProps> = memo(({ 
  data = null, 
  selectedElement: propSelectedElement = null 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedElement, setSelectedElement] = useState<CodeElement | null>(propSelectedElement);
    const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());
    const [filterType, setFilterType] = useState<'all' | 'module' | 'class' | 'function'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'type' | 'file' | 'usages'>('name');

    // Update selected element when prop changes
    useEffect(() => {
        if (propSelectedElement) {
            setSelectedElement(propSelectedElement);
            setExpandedElements(prev => new Set([...prev, propSelectedElement.id]));
        }
    }, [propSelectedElement]);

    // Sample data structure to match AnalysisData
    const sampleData: any = useMemo(() => ({
        project_name: 'Sample Project',
        total_files: 5,
        total_lines: 500,
        dependencies: [],
        analysis_metadata: {},
        code_elements: [
            {
                id: 'test_module',
                name: 'test_module',
                type: 'module'
            },
            {
                id: 'test_class',
                name: 'TestClass',
                type: 'class'
            },
            {
                id: 'test_function',
                name: 'test_function',
                type: 'function'
            }
        ]
    }), []);

    const displayData = data || sampleData;

    // Process and filter elements
    const processedElements = useMemo(() => {
        if (!displayData || !displayData.code_elements) {
            return { all: [], modules: 0, classes: 0, functions: 0 };
        }

        const elements = displayData.code_elements.map((el: any) => ({
            ...el,
            elementType: el.type,
            icon: el.type === 'module' ? Folder : el.type === 'class' ? Class : Functions
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
                el.name.toLowerCase().includes(term)
            );
        }

        // Sort elements
        filtered.sort((a: any, b: any) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'type':
                    return a.elementType.localeCompare(b.elementType);
                default:
                    return 0;
            }
        });

        const counts = {
            modules: elements.filter((el: any) => el.type === 'module').length,
            classes: elements.filter((el: any) => el.type === 'class').length,
            functions: elements.filter((el: any) => el.type === 'function').length
        };

        return {
            all: filtered,
            ...counts
        };
    }, [displayData, searchTerm, filterType, sortBy]);

    const handleElementClick = useCallback((element: any) => {
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

    const renderElementItem = useCallback((element: any) => {
        const isExpanded = expandedElements.has(element.id);
        const IconComponent = element.icon;

        return (
            <Box key={element.id}>
                <ListItem disablePadding>
                    <ListItemButton
                        onClick={() => handleElementClick(element)}
                        sx={{
                            borderLeft: `4px solid ${getElementColor(element.elementType)}`,
                            mb: 1,
                            backgroundColor: selectedElement?.id === element.id ? '#f5f5f5' : 'transparent',
                            '&:hover': { backgroundColor: '#f0f0f0' }
                        }}
                    >
                        <ListItemIcon>
                            <IconComponent sx={{ color: getElementColor(element.elementType) }} />
                        </ListItemIcon>
                        <ListItemText
                            primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        {element.name}
                                    </Typography>
                                    <Chip
                                        label={element.elementType}
                                        size="small"
                                        sx={{
                                            backgroundColor: getElementColor(element.elementType),
                                            color: 'white',
                                            fontSize: '0.7rem'
                                        }}
                                    />
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
                        <Typography variant="body2" color="text.secondary">
                            Element details would appear here.
                        </Typography>
                    </Box>
                </Collapse>
            </Box>
        );
    }, [expandedElements, selectedElement, handleElementClick, handleExpandToggle, getElementColor]);

    return (
        <Box sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Code />
                    Code Explorer
                </Typography>

                <Box sx={{ display: 'flex', gap: 3, height: '800px' }}>
                    {/* Left Panel - Element List */}
                    <Box sx={{ width: '400px', borderRight: '1px solid #e0e0e0', pr: 2 }}>
                        {/* Search and Filters */}
                        <Box sx={{ mb: 3 }}>
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
                                    </Select>
                                </FormControl>
                            </Box>
                        </Box>

                        {/* Statistics */}
                        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
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

                        {/* Element List */}
                        <Box sx={{ maxHeight: '600px', overflow: 'auto' }}>
                            {processedElements.all.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {searchTerm ? 'No elements match your search' : 'No elements found'}
                                    </Typography>
                                </Box>
                            ) : (
                                processedElements.all.map(renderElementItem)
                            )}
                        </Box>
                    </Box>

                    {/* Right Panel - Element Details */}
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {!selectedElement ? (
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Code sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">
                                    Select an element to view details
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Click on any element from the list to see detailed information and usage patterns
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ p: 3 }}>
                                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                    {selectedElement.name}
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    {selectedElement.type}
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                                    Detailed information for {selectedElement.name} would appear here.
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
});

CodeExplorer.displayName = 'CodeExplorer';

export default CodeExplorer;