import { useState, useMemo, useEffect } from 'react';
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
    Divider,
    IconButton,
    Collapse,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tooltip,
    Badge,
    ListItemButton
} from '@mui/material';
import {
    Code,
    Class,
    Functions,
    Search,
    ExpandMore,
    ExpandLess,
    LocationOn,
    Visibility,
    Launch,
    Description,
    AccountTree,
    Folder
} from '@mui/icons-material';
import LazyList from './LazyList';
import CollapsibleSection from './CollapsibleSection';
import TabbedInterface from './TabbedInterface';

const CodeExplorer = ({ data = null, selectedElement: propSelectedElement = null }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedElement, setSelectedElement] = useState(propSelectedElement);
    const [expandedElements, setExpandedElements] = useState(new Set());
    const [filterType, setFilterType] = useState('all');
    const [sortBy, setSortBy] = useState('name');

    // Update selected element when prop changes
    useEffect(() => {
        if (propSelectedElement) {
            setSelectedElement(propSelectedElement);
            // Expand the element details
            setExpandedElements(prev => new Set([...prev, propSelectedElement.id]));
        }
    }, [propSelectedElement]);

    // Sample data for testing when no real data is available
    const sampleData = {
        data: {
            modules: [
                {
                    id: 'test_module',
                    name: 'test_module',
                    type: 'module',
                    location: { file_path: '/project/test_module.py', line_number: 1 },
                    docstring: 'Test module for unit testing',
                    dependencies: ['unittest', 'mock'],
                    usages: [
                        {
                            location: { file_path: '/project/main.py', line_number: 5, column_number: 1 },
                            context: 'import test_module',
                            usage_type: 'import'
                        }
                    ]
                }
            ],
            classes: [
                {
                    id: 'test_class',
                    name: 'TestClass',
                    type: 'class',
                    location: { file_path: '/project/models.py', line_number: 10 },
                    docstring: 'A test class for demonstration',
                    parameters: [
                        { name: 'name', type_hint: 'str' },
                        { name: 'value', type_hint: 'int', default_value: '0' }
                    ],
                    decorators: ['dataclass'],
                    dependencies: ['dataclasses'],
                    usages: [
                        {
                            location: { file_path: '/project/views.py', line_number: 15, column_number: 8 },
                            context: 'instance = TestClass(name="test", value=42)',
                            usage_type: 'call'
                        }
                    ]
                }
            ],
            functions: [
                {
                    id: 'test_function',
                    name: 'test_function',
                    type: 'function',
                    location: { file_path: '/project/utils.py', line_number: 25 },
                    docstring: 'A test function that processes data',
                    parameters: [
                        { name: 'data', type_hint: 'List[str]' },
                        { name: 'options', type_hint: 'Optional[Dict]', default_value: 'None' }
                    ],
                    return_type: 'bool',
                    decorators: ['staticmethod'],
                    dependencies: ['typing'],
                    usages: [
                        {
                            location: { file_path: '/project/main.py', line_number: 45, column_number: 12 },
                            context: 'result = test_function(input_data)',
                            usage_type: 'call'
                        }
                    ]
                }
            ]
        }
    };

    const displayData = data || sampleData;

    // Process and filter elements based on search and filter criteria
    const processedElements = useMemo(() => {
        if (!displayData || !displayData.data) return { modules: [], classes: [], functions: [], all: [] };

        const { modules = [], classes = [], functions = [] } = displayData.data;

        // Combine all elements with enhanced metadata
        const allElements = [
            ...modules.map(el => ({ ...el, elementType: 'module', icon: Folder })),
            ...classes.map(el => ({ ...el, elementType: 'class', icon: Class })),
            ...functions.map(el => ({ ...el, elementType: 'function', icon: Functions }))
        ];

        // Filter by type
        let filtered = allElements;
        if (filterType !== 'all') {
            filtered = allElements.filter(el => el.elementType === filterType);
        }

        // Filter by search term
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(el =>
                el.name.toLowerCase().includes(term) ||
                (el.docstring && el.docstring.toLowerCase().includes(term)) ||
                (el.location?.file_path && el.location.file_path.toLowerCase().includes(term))
            );
        }

        // Sort elements
        filtered.sort((a, b) => {
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

        return {
            modules: modules.map(el => ({ ...el, elementType: 'module', icon: Folder })),
            classes: classes.map(el => ({ ...el, elementType: 'class', icon: Class })),
            functions: functions.map(el => ({ ...el, elementType: 'function', icon: Functions })),
            all: filtered
        };
    }, [displayData, searchTerm, filterType, sortBy]);

    const handleElementClick = (element) => {
        setSelectedElement(element);
    };

    const handleExpandToggle = (elementId) => {
        const newExpanded = new Set(expandedElements);
        if (newExpanded.has(elementId)) {
            newExpanded.delete(elementId);
        } else {
            newExpanded.add(elementId);
        }
        setExpandedElements(newExpanded);
    };



    const getElementColor = (elementType) => {
        switch (elementType) {
            case 'module': return '#1976d2';
            case 'class': return '#388e3c';
            case 'function': return '#f57c00';
            default: return '#666';
        }
    };

    const formatFilePath = (filePath) => {
        if (!filePath) return 'Unknown';
        const parts = filePath.split('/');
        return parts.length > 3 ? `.../${parts.slice(-2).join('/')}` : filePath;
    };

    const renderElementItem = (element, index) => {
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
                            backgroundColor: selectedElement?.id === element.id ? 'action.selected' : 'transparent',
                            '&:hover': { backgroundColor: 'action.hover' }
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
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        {formatFilePath(element.location?.file_path)}
                                        {element.location?.line_number && ` : Line ${element.location.line_number}`}
                                    </Typography>
                                    {element.docstring && (
                                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                                            {element.docstring.length > 100
                                                ? `${element.docstring.substring(0, 100)}...`
                                                : element.docstring
                                            }
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
                        {/* Element Details using CollapsibleSection */}
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
                                    {element.parameters.map((param, paramIndex) => (
                                        <Chip
                                            key={paramIndex}
                                            label={`${param.name}${param.type_hint ? `: ${param.type_hint}` : ''}${param.default_value ? ` = ${param.default_value}` : ''}`}
                                            size="small"
                                            variant="outlined"
                                            sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                                        />
                                    ))}
                                </Box>
                            )}

                            {element.return_type && (
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Returns:</strong> {element.return_type}
                                </Typography>
                            )}

                            {element.decorators && element.decorators.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        Decorators:
                                    </Typography>
                                    {element.decorators.map((decorator, decoratorIndex) => (
                                        <Chip
                                            key={decoratorIndex}
                                            label={`@${decorator}`}
                                            size="small"
                                            color="secondary"
                                            sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                                        />
                                    ))}
                                </Box>
                            )}

                            {element.dependencies && element.dependencies.length > 0 && (
                                <CollapsibleSection
                                    title={`Dependencies (${element.dependencies.length})`}
                                    badge={element.dependencies.length}
                                    defaultExpanded={element.dependencies.length <= 10}
                                    variant="outlined"
                                >
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {element.dependencies.map((dep, depIndex) => (
                                            <Chip
                                                key={depIndex}
                                                label={dep}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: '0.7rem' }}
                                            />
                                        ))}
                                    </Box>
                                </CollapsibleSection>
                            )}
                        </CollapsibleSection>

                        {/* Usage Information with LazyList */}
                        {element.usages && element.usages.length > 0 && (
                            <CollapsibleSection
                                title="Usage Locations"
                                icon={<Visibility />}
                                badge={element.usages.length}
                                defaultExpanded={element.usages.length <= 5}
                                variant="outlined"
                            >
                                <LazyList
                                    items={element.usages}
                                    initialBatchSize={5}
                                    batchSize={10}
                                    maxItems={50}
                                    renderItem={(usage, usageIndex) => (
                                        <ListItem key={usageIndex} sx={{ pl: 0 }}>
                                            <ListItemIcon sx={{ minWidth: 32 }}>
                                                <LocationOn fontSize="small" color="action" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                            {formatFilePath(usage.location.file_path)}
                                                        </Typography>
                                                        <Chip
                                                            label={`Line ${usage.location.line_number}`}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ fontSize: '0.6rem' }}
                                                        />
                                                        <Chip
                                                            label={usage.usage_type}
                                                            size="small"
                                                            color="primary"
                                                            sx={{ fontSize: '0.6rem' }}
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
                                                                fontSize: '0.75rem',
                                                                backgroundColor: 'action.hover',
                                                                padding: '2px 4px',
                                                                borderRadius: '2px',
                                                                mt: 0.5
                                                            }}
                                                        >
                                                            {usage.context.length > 80
                                                                ? `${usage.context.substring(0, 80)}...`
                                                                : usage.context
                                                            }
                                                        </Typography>
                                                    )
                                                }
                                            />
                                            <Tooltip title="Navigate to usage">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        console.log('Navigate to:', usage.location);
                                                    }}
                                                >
                                                    <Launch fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </ListItem>
                                    )}
                                    sx={{ p: 0 }}
                                />
                            </CollapsibleSection>
                        )}
                    </Box>
                </Collapse>
            </Box>
        );
    };

    const renderElementList = (elements) => {
        if (elements.length === 0) {
            return (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                        {searchTerm ? 'No elements match your search' : 'No elements found'}
                    </Typography>
                </Box>
            );
        }

        return (
            <LazyList
                items={elements}
                renderItem={renderElementItem}
                initialBatchSize={15}
                batchSize={20}
                maxItems={200}
                sx={{ p: 0 }}
            />
        );
    };

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

        const IconComponent = selectedElement.icon;

        return (
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <IconComponent sx={{ fontSize: 32, color: getElementColor(selectedElement.elementType) }} />
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            {selectedElement.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Chip
                                label={selectedElement.elementType}
                                size="small"
                                sx={{
                                    backgroundColor: getElementColor(selectedElement.elementType),
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
                                                    backgroundColor: 'action.hover',
                                                    padding: 2,
                                                    borderRadius: 1,
                                                    whiteSpace: 'pre-wrap'
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
                                                {selectedElement.parameters.map((param, index) => (
                                                    <ListItem key={index} sx={{ pl: 0 }}>
                                                        <ListItemText
                                                            primary={
                                                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                                    <strong>{param.name}</strong>
                                                                    {param.type_hint && <span style={{ color: 'inherit', opacity: 0.7 }}>: {param.type_hint}</span>}
                                                                    {param.default_value && <span style={{ color: 'inherit', opacity: 0.5 }}> = {param.default_value}</span>}
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
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }} color="text.secondary">
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
                                                {selectedElement.decorators.map((decorator, index) => (
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
                                    {selectedElement.usages && selectedElement.usages.length > 0 && (
                                        <LazyList
                                            items={selectedElement.usages}
                                            initialBatchSize={10}
                                            batchSize={15}
                                            maxItems={100}
                                            renderItem={(usage, index) => (
                                                <ListItem key={index} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                                                    <ListItemIcon>
                                                        <LocationOn color="action" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                                    {formatFilePath(usage.location.file_path)}
                                                                </Typography>
                                                                <Chip
                                                                    label={`Line ${usage.location.line_number}:${usage.location.column_number}`}
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
                                                                        backgroundColor: 'action.hover',
                                                                        padding: 1,
                                                                        borderRadius: 1,
                                                                        border: '1px solid',
                                                                        borderColor: 'divider',
                                                                        whiteSpace: 'pre-wrap'
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
                                            renderItem={(dep, index) => (
                                                <ListItem key={index} sx={{ pl: 0 }}>
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
                        borderRight: '1px solid',
                        borderColor: 'divider', 
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
                                        onChange={(e) => setFilterType(e.target.value)}
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
                                        onChange={(e) => setSortBy(e.target.value)}
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
                        <Box sx={{ mb: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1, flexShrink: 0 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Statistics
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Chip
                                    icon={<Folder />}
                                    label={`${processedElements.modules.length} Modules`}
                                    size="small"
                                    color="primary"
                                />
                                <Chip
                                    icon={<Class />}
                                    label={`${processedElements.classes.length} Classes`}
                                    size="small"
                                    color="success"
                                />
                                <Chip
                                    icon={<Functions />}
                                    label={`${processedElements.functions.length} Functions`}
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
                                backgroundColor: 'action.hover',
                                borderRadius: '4px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                backgroundColor: 'action.disabled',
                                borderRadius: '4px',
                                '&:hover': {
                                    backgroundColor: 'action.active',
                                },
                            },
                        }}>
                            {renderElementList(processedElements.all)}
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
                            backgroundColor: 'action.hover',
                            borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: 'action.disabled',
                            borderRadius: '4px',
                            '&:hover': {
                                backgroundColor: 'action.active',
                            },
                        },
                    }}>
                        {renderSelectedElementDetails()}
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

export default CodeExplorer;