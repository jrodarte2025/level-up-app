import React from "react";
import { Box } from "@mui/material";

const CardWrapper = ({ children, sx = {} }) => (
  <Box
    sx={{
      backgroundColor: 'background.paper',
      borderRadius: 2,
      p: 2,
      mb: 2,
      ...sx,
    }}
  >
    {children}
  </Box>
);

export default CardWrapper;