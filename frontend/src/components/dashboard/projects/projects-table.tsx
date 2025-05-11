'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import TableContainer from '@mui/material/TableContainer';

import { useSelection } from '@/hooks/use-selection';

function noop(): void {
  // do nothing
}

export interface Project {
  id: string;
  avatar: string;
  name: string;
  email: string;
  address: { city: string; state: string; country: string; street: string };
  phone: string;
  createdAt: Date;
}

interface ProjectsTableProps {
  count?: number;
  page?: number;
  rows?: Project[];
  rowsPerPage?: number;
}

export function ProjectsTable({
  count = 0,
  rows = [],
  page = 0,
  rowsPerPage = 0,
}: ProjectsTableProps): React.JSX.Element {
  const rowIds = React.useMemo(() => {
    return rows.map((project) => project.id);
  }, [rows]);

  const { selectAll, deselectAll, selectOne, deselectOne, selected } = useSelection(rowIds);

  const selectedSome = (selected?.size ?? 0) > 0 && (selected?.size ?? 0) < rows.length;
  const selectedAll = rows.length > 0 && selected?.size === rows.length;

  return (
    <TableContainer 
      sx={{
        background: 'rgba(20, 20, 20, 0.6)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '16px',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        
      }}
    >
      <Table stickyHeader sx={{ minWidth: '800px' }}>
        <TableHead  sx={{ 
          '& .MuiTableCell-root': {  // Target all table cells in the header
            backgroundColor: 'black',  // Black background
            color: 'white',         // White text
            fontWeight: 'bold'      // Make text bold for better contrast
          }
        }}>
          <TableRow >
            <TableCell padding="checkbox">
              <Checkbox
                checked={selectedAll}
                indeterminate={selectedSome}
                onChange={(event) => {
                  if (event.target.checked) {
                    selectAll();
                  } else {
                    deselectAll();
                  }
                }}
              />
            </TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Signed Up</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const isSelected = selected?.has(row.id);

            return (
              <TableRow hover key={row.id} selected={isSelected} sx={{ 
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05) !important',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08) !important',
                },
                '& td': { 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                },
                transition: 'background-color 0.2s ease'
              }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected}
                    onChange={(event) => {
                      if (event.target.checked) {
                        selectOne(row.id);
                      } else {
                        deselectOne(row.id);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Stack sx={{ alignItems: 'center' }} direction="row" spacing={2}>
                    <Avatar src={row.avatar} />
                    <Typography variant="subtitle2" sx={{ color: 'white' }}>{row.name}</Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ color: 'white' }}>{row.email}</TableCell>
                <TableCell sx={{ color: 'white' }}>
                  {row.address.city}, {row.address.state}, {row.address.country}
                </TableCell>
                <TableCell sx={{ color: 'white' }}>{row.phone}</TableCell>
                <TableCell sx={{ color: 'white' }}>{dayjs(row.createdAt).format('MMM D, YYYY')}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Divider />
      <TablePagination
        sx={{ color: 'white' }}
        component="div"
        count={count}
        onPageChange={noop}
        onRowsPerPageChange={noop}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </TableContainer>
  );
}
