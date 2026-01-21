/**
 * Accessibility Statement Page
 *
 * Documents Read Master's commitment to accessibility
 * and provides contact information for accessibility concerns (WCAG 2.2 AAA)
 */

import {
  Container,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Link,
  Paper,
  Divider,
} from "@mui/material";
import { Helmet } from "react-helmet-async";

export function AccessibilityStatementPage() {
  return (
    <>
      <Helmet>
        <title>Accessibility Statement - Read Master</title>
        <meta
          name="description"
          content="Read Master's commitment to web accessibility and WCAG 2.2 AAA compliance"
        />
      </Helmet>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h1" component="h1" gutterBottom>
          Accessibility Statement
        </Typography>

        <Typography variant="body1" paragraph>
          Last updated: January 2026
        </Typography>

        <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: "primary.light" }}>
          <Typography variant="h6" gutterBottom>
            Our Commitment
          </Typography>
          <Typography variant="body1">
            Read Master is committed to ensuring digital accessibility for people
            with disabilities. We are continually improving the user experience
            for everyone and applying the relevant accessibility standards.
          </Typography>
        </Paper>

        <Box component="section" mb={4}>
          <Typography variant="h2" component="h2" gutterBottom>
            Conformance Status
          </Typography>
          <Typography variant="body1" paragraph>
            The{" "}
            <Link
              href="https://www.w3.org/WAI/WCAG22/quickref/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Web Content Accessibility Guidelines (WCAG)
            </Link>{" "}
            define requirements for designers and developers to improve
            accessibility for people with disabilities.
          </Typography>
          <Typography variant="body1" paragraph>
            Read Master aims to conform to{" "}
            <strong>WCAG 2.2 Level AAA</strong>. AAA conformance means that our
            content meets all Level A, AA, and AAA Success Criteria.
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box component="section" mb={4}>
          <Typography variant="h2" component="h2" gutterBottom>
            Accessibility Features
          </Typography>
          <Typography variant="body1" paragraph>
            Read Master includes the following accessibility features:
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Keyboard Navigation"
                secondary="All features are accessible via keyboard without a mouse"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Screen Reader Support"
                secondary="Tested with NVDA, JAWS, VoiceOver, and TalkBack"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="High Contrast Ratios"
                secondary="All text meets WCAG AAA contrast requirements (7:1)"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Visible Focus Indicators"
                secondary="Clear visual indicators show which element has keyboard focus"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Skip Navigation Links"
                secondary="Bypass repetitive content and jump to main areas"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Resizable Text"
                secondary="Text can be resized up to 400% without loss of content or functionality"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Alternative Text"
                secondary="All images include descriptive alt text"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="ARIA Landmarks"
                secondary="Proper HTML5 semantic elements and ARIA roles"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Form Labels"
                secondary="All form inputs have associated labels and error messages"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Touch Targets"
                secondary="Minimum 44×44 pixel target size for all interactive elements"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Reduced Motion"
                secondary="Respects prefers-reduced-motion user preferences"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Multiple Themes"
                secondary="Light, Dark, Sepia, and High Contrast themes available"
              />
            </ListItem>
          </List>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box component="section" mb={4}>
          <Typography variant="h2" component="h2" gutterBottom>
            Assistive Technologies
          </Typography>
          <Typography variant="body1" paragraph>
            Read Master is designed to be compatible with the following assistive
            technologies:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Screen readers (NVDA, JAWS, VoiceOver, TalkBack, Narrator)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Keyboard-only navigation" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Voice control software (Dragon NaturallySpeaking, Voice Control)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Screen magnifiers (ZoomText, MAGic)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Browser zoom (up to 400%)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="High contrast modes (Windows High Contrast, Increased Contrast)" />
            </ListItem>
          </List>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box component="section" mb={4}>
          <Typography variant="h2" component="h2" gutterBottom>
            Assessment Approach
          </Typography>
          <Typography variant="body1" paragraph>
            Read Master's accessibility was evaluated using the following methods:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Self-evaluation with automated testing tools (axe-core, WAVE)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Manual testing with screen readers" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Keyboard-only navigation testing" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Color contrast analysis" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Zoom and reflow testing (up to 400%)" />
            </ListItem>
          </List>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box component="section" mb={4}>
          <Typography variant="h2" component="h2" gutterBottom>
            Known Limitations
          </Typography>
          <Typography variant="body1" paragraph>
            Despite our best efforts, some limitations may exist:
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="PDF Files"
                secondary="Some uploaded PDF files may not be fully accessible depending on their source"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Third-Party Content"
                secondary="Embedded content from external sources may have varying levels of accessibility"
              />
            </ListItem>
          </List>
          <Typography variant="body1" paragraph>
            We are actively working to address these limitations.
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box component="section" mb={4}>
          <Typography variant="h2" component="h2" gutterBottom>
            Feedback and Contact
          </Typography>
          <Typography variant="body1" paragraph>
            We welcome your feedback on the accessibility of Read Master. Please
            let us know if you encounter accessibility barriers:
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Email"
                secondary={
                  <Link href="mailto:accessibility@readmaster.ai">
                    accessibility@readmaster.ai
                  </Link>
                }
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Response Time"
                secondary="We aim to respond to accessibility feedback within 2 business days"
              />
            </ListItem>
          </List>
          <Typography variant="body1" paragraph>
            When reporting an accessibility issue, please include:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="The specific page or feature" />
            </ListItem>
            <ListItem>
              <ListItemText primary="The assistive technology you're using (if applicable)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="A description of the problem" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Your browser and operating system" />
            </ListItem>
          </List>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box component="section" mb={4}>
          <Typography variant="h2" component="h2" gutterBottom>
            Formal Complaints
          </Typography>
          <Typography variant="body1" paragraph>
            If you are not satisfied with our response to your accessibility
            concern, you may file a formal complaint with:
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="U.S. Department of Justice"
                secondary={
                  <Link
                    href="https://www.ada.gov/filing_complaint.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ADA Complaint Process
                  </Link>
                }
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Your Local Disability Rights Organization"
                secondary={
                  <Link
                    href="https://www.ndrn.org/about/ndrn-member-agencies/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Find Your Local Agency
                  </Link>
                }
              />
            </ListItem>
          </List>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box component="section" mb={4}>
          <Typography variant="h2" component="h2" gutterBottom>
            Technical Specifications
          </Typography>
          <Typography variant="body1" paragraph>
            Accessibility of Read Master relies on the following technologies:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="HTML5" />
            </ListItem>
            <ListItem>
              <ListItemText primary="WAI-ARIA" />
            </ListItem>
            <ListItem>
              <ListItemText primary="CSS3" />
            </ListItem>
            <ListItem>
              <ListItemText primary="JavaScript (ES2020+)" />
            </ListItem>
          </List>
          <Typography variant="body1" paragraph>
            These technologies are relied upon for conformance with the
            accessibility standards used.
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box component="section" mb={4}>
          <Typography variant="h2" component="h2" gutterBottom>
            Additional Resources
          </Typography>
          <List>
            <ListItem>
              <Link href="/keyboard-shortcuts">
                <ListItemText primary="Keyboard Shortcuts Guide" />
              </Link>
            </ListItem>
            <ListItem>
              <Link
                href="https://www.w3.org/WAI/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ListItemText primary="W3C Web Accessibility Initiative (WAI)" />
              </Link>
            </ListItem>
            <ListItem>
              <Link
                href="https://webaim.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ListItemText primary="WebAIM - Web Accessibility In Mind" />
              </Link>
            </ListItem>
          </List>
        </Box>

        <Paper elevation={0} sx={{ p: 3, mt: 4, bgcolor: "grey.100" }}>
          <Typography variant="body2" color="text.secondary">
            This statement was created on January 21, 2026 using the{" "}
            <Link
              href="https://www.w3.org/WAI/planning/statements/"
              target="_blank"
              rel="noopener noreferrer"
            >
              W3C Accessibility Statement Generator Tool
            </Link>
            .
          </Typography>
        </Paper>
      </Container>
    </>
  );
}
