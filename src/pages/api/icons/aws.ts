import type { NextApiRequest, NextApiResponse } from 'next';
import { getIcons } from '@/utils/localIconDb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { category, service_name } = req.query;
  const filter: any = { provider: 'aws' };
  if (category) filter.category = category;
  if (service_name) filter.service_name = service_name;
  const icons = await getIcons(filter);
  res.status(200).json(icons);
} 